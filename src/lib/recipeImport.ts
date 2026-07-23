import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { RecipeSourceType } from '../types/database';

export interface ImportedRecipe {
  platform: RecipeSourceType;
  title: string;
  image: string | null;
  caption: string;
  ingredients: string[];
  steps: string[];
  parseMethod: 'heuristic' | 'gemini' | 'none';
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const { data, error } = await supabase.functions.invoke('import-recipe', {
    body: { url },
  });

  if (error) {
    let message = error.message || 'Failed to import recipe';
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }

  return data as ImportedRecipe;
}
