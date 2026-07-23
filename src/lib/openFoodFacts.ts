// Open Food Facts — free, no API key required.
// https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/

export interface ScannedProduct {
  barcode: string;
  name: string;
  image: string | null;
  caloriesPer100g: number | null;
  proteinPer100gG: number | null;
  carbsPer100gG: number | null;
  fatPer100gG: number | null;
}

const FIELDS = 'product_name,nutriments,image_front_url';

export async function lookupBarcode(barcode: string): Promise<ScannedProduct | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  );
  if (!response.ok) throw new Error(`Open Food Facts request failed (${response.status})`);

  const json = await response.json();
  if (json.status !== 1 || !json.product) return null;

  const nutriments = json.product.nutriments ?? {};
  const name = json.product.product_name?.trim();
  if (!name) return null;

  return {
    barcode,
    name,
    image: json.product.image_front_url ?? null,
    caloriesPer100g: typeof nutriments['energy-kcal_100g'] === 'number' ? nutriments['energy-kcal_100g'] : null,
    proteinPer100gG: typeof nutriments['proteins_100g'] === 'number' ? nutriments['proteins_100g'] : null,
    carbsPer100gG: typeof nutriments['carbohydrates_100g'] === 'number' ? nutriments['carbohydrates_100g'] : null,
    fatPer100gG: typeof nutriments['fat_100g'] === 'number' ? nutriments['fat_100g'] : null,
  };
}
