import type { FoodSource, MealType } from './types/database';

export const colors = {
  background: '#FDF6EC',
  surface: '#FFFFFF',
  surfaceTint: '#FBEAC8',
  surfaceMuted: '#F5EBD8',

  primary: '#F2A93B',
  primaryDark: '#C9791A',
  primaryLight: '#F7CC85',

  ink: '#2B2118',
  inkSoft: '#5C5142',
  inkMuted: '#8C816D',

  border: '#EFE1C4',
  borderStrong: '#E0CDA0',

  error: '#D64545',
  onPrimary: '#2B2118',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 20,
  circle: 999,
};

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.ink },
  headline: { fontSize: 20, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.inkSoft },
  caption: { fontSize: 12, color: colors.inkMuted },
};

/** MaterialCommunityIcons names. */
export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: 'food-croissant',
  lunch: 'food-variant',
  dinner: 'silverware-fork-knife',
  snack: 'cookie',
};

/** Ionicons names. */
export const FOOD_SOURCE_ICONS: Record<FoodSource, string> = {
  usda: 'nutrition-outline',
  barcode: 'barcode-outline',
  recipe: 'restaurant-outline',
  manual: 'restaurant-outline',
};
