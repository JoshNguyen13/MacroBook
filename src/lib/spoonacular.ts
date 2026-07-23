import { supabase } from './supabase';

export interface SpoonacularRecipeSummary {
  id: number;
  title: string;
  image: string | null;
  servings: number | null;
  readyInMinutes: number | null;
  sourceUrl?: string | null;
  extendedIngredients?: { original: string }[];
  analyzedInstructions?: { steps: { number: number; step: string }[] }[];
  instructions?: string | null;
  nutrition?: { nutrients: { name: string; amount: number; unit: string }[] };
}

export interface SpoonacularIngredientMatch {
  id: number;
  title: string;
  image: string | null;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: { name: string }[];
}

async function invoke<T>(query: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`spoonacular-search?${query}`);
  if (error) throw error;
  return data as T;
}

export async function searchRecipes(query: string): Promise<SpoonacularRecipeSummary[]> {
  const data = await invoke<{ results: SpoonacularRecipeSummary[] }>(
    `mode=search&query=${encodeURIComponent(query)}&number=20`
  );
  return data.results ?? [];
}

export async function findRecipesByIngredients(
  ingredients: string[]
): Promise<SpoonacularIngredientMatch[]> {
  const data = await invoke<SpoonacularIngredientMatch[]>(
    `mode=byIngredients&ingredients=${encodeURIComponent(ingredients.join(','))}&number=20`
  );
  return data ?? [];
}

export async function getRecipeDetail(id: number): Promise<SpoonacularRecipeSummary> {
  return invoke<SpoonacularRecipeSummary>(`mode=detail&id=${id}`);
}

export function higherResImage(url: string | null, size: '240x150' | '556x370' | '636x393' = '556x370') {
  if (!url) return null;
  return url.replace(/-\d+x\d+\.(jpg|png)$/i, `-${size}.$1`);
}

function findNutrient(recipe: SpoonacularRecipeSummary, name: string): number | null {
  const match = recipe.nutrition?.nutrients.find((n) => n.name === name);
  return typeof match?.amount === 'number' ? match.amount : null;
}

export function normalizeRecipe(recipe: SpoonacularRecipeSummary) {
  const ingredients = (recipe.extendedIngredients ?? []).map((i) => i.original);

  const steps = recipe.analyzedInstructions?.[0]?.steps?.length
    ? recipe.analyzedInstructions[0].steps.map((s) => s.step)
    : (recipe.instructions ?? '')
        .replace(/<[^>]+>/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    title: recipe.title,
    image: recipe.image,
    ingredients,
    steps,
    sourceUrl: recipe.sourceUrl ?? null,
    servings: recipe.servings ?? null,
    caloriesPerServing: findNutrient(recipe, 'Calories'),
    proteinPerServingG: findNutrient(recipe, 'Protein'),
    carbsPerServingG: findNutrient(recipe, 'Carbohydrates'),
    fatPerServingG: findNutrient(recipe, 'Fat'),
  };
}
