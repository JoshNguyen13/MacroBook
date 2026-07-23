import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecipesScreen from '../screens/recipes/RecipesScreen';
import RecipeDetailScreen from '../screens/recipes/RecipeDetailScreen';
import SavedRecipesScreen from '../screens/recipes/SavedRecipesScreen';
import ImportRecipeScreen from '../screens/recipes/ImportRecipeScreen';
import EditRecipeScreen from '../screens/recipes/EditRecipeScreen';
import WhatCanIMakeScreen from '../screens/recipes/WhatCanIMakeScreen';
import type { RecipeSourceType } from '../types/database';

export type RecipeDetailParams =
  | {
      mode: 'saved';
      id: string;
      title: string;
      image: string | null;
      ingredients: string[];
      steps: string[];
      sourceType: RecipeSourceType;
      sourceUrl: string | null;
      rawCaption: string | null;
      servings: number | null;
      caloriesPerServing: number | null;
      proteinPerServingG: number | null;
      carbsPerServingG: number | null;
      fatPerServingG: number | null;
    }
  | {
      mode: 'spoonacular';
      spoonacularId: number;
      title: string;
      image: string | null;
    };

export type RecipesStackParamList = {
  RecipesSearch: undefined;
  SavedRecipes: undefined;
  RecipeDetail: RecipeDetailParams;
  ImportRecipe: undefined;
  EditRecipe: { recipeId: string };
  WhatCanIMake: undefined;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RecipesSearch" component={RecipesScreen} options={{ title: 'Recipes' }} />
      <Stack.Screen name="SavedRecipes" component={SavedRecipesScreen} options={{ title: 'Saved Recipes' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
      <Stack.Screen name="ImportRecipe" component={ImportRecipeScreen} options={{ title: 'Import Recipe' }} />
      <Stack.Screen name="EditRecipe" component={EditRecipeScreen} options={{ title: 'Edit Recipe' }} />
      <Stack.Screen name="WhatCanIMake" component={WhatCanIMakeScreen} options={{ title: 'What Can I Make?' }} />
    </Stack.Navigator>
  );
}
