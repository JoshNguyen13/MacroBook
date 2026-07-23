import { USDA_API_KEY } from '@env';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export interface UsdaFoodResult {
  fdcId: number;
  description: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

function extractNutrient(foodNutrients: any[], nutrientId: number): number | null {
  const match = foodNutrients?.find((n) => n.nutrientId === nutrientId);
  return typeof match?.value === 'number' ? match.value : null;
}

export async function searchUsdaFoods(query: string): Promise<UsdaFoodResult[]> {
  const apiKey = USDA_API_KEY && USDA_API_KEY !== 'your-usda-key' ? USDA_API_KEY : 'DEMO_KEY';
  const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=20&dataType=Foundation,SR%20Legacy,Branded&api_key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USDA search failed (${response.status})`);
  }
  const json = await response.json();

  return (json.foods ?? [])
    .map((food: any) => ({
      fdcId: food.fdcId,
      description: food.description,
      calories: extractNutrient(food.foodNutrients, NUTRIENT_IDS.calories) ?? 0,
      proteinG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.protein),
      carbsG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.carbs),
      fatG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.fat),
    }))
    .filter((food: UsdaFoodResult) => food.calories > 0);
}
