import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { RecipeSourceType } from '../types/database';

export interface ImportedMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ImportedRecipe {
  platform: RecipeSourceType;
  title: string;
  image: string | null;
  caption: string;
  ingredients: string[];
  steps: string[];
  parseMethod: 'heuristic' | 'line-heuristic' | 'website' | 'gemini' | 'none';
  macros: ImportedMacros | null;
  macrosSource: 'caption' | 'estimated' | 'none';
}

async function invokeImport(body: { url?: string; caption?: string; forceGemini?: boolean }) {
  const { data, error } = await supabase.functions.invoke('import-recipe', { body });

  if (error) {
    let message = error.message || 'Failed to import recipe';
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json().catch(() => null);
      if (errorBody?.error) message = errorBody.error;
    }
    throw new Error(message);
  }

  return data as ImportedRecipe;
}

export function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  return invokeImport({ url });
}

/** Parses a caption directly, skipping the fetch step — used when auto-fetch fails
 * (manual paste) or to force a fresh Gemini pass over a caption already on hand
 * ("re-parse with AI"). */
export function parseCaption(caption: string, forceGemini = false): Promise<ImportedRecipe> {
  return invokeImport({ caption, forceGemini });
}
