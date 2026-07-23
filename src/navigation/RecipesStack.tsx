import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RecipesScreen from '../screens/recipes/RecipesScreen';
import RecipeDetailScreen from '../screens/recipes/RecipeDetailScreen';
import SavedRecipesScreen from '../screens/recipes/SavedRecipesScreen';
import ImportRecipeScreen from '../screens/recipes/ImportRecipeScreen';
import ImportReviewScreen from '../screens/recipes/ImportReviewScreen';
import type { RecipeSourceType } from '../types/database';

export type RecipeDetailParams =
  | {
      mode: 'saved';
      title: string;
      image: string | null;
      ingredients: string[];
      steps: string[];
      sourceType: RecipeSourceType;
      sourceUrl: string | null;
    }
  | {
      mode: 'spoonacular';
      spoonacularId: number;
      title: string;
      image: string | null;
    };

export type ImportReviewParams = {
  platform: RecipeSourceType;
  title: string;
  image: string | null;
  caption: string;
  ingredients: string[];
  steps: string[];
  sourceUrl: string;
};

export type RecipesStackParamList = {
  RecipesSearch: undefined;
  SavedRecipes: undefined;
  RecipeDetail: RecipeDetailParams;
  ImportRecipe: undefined;
  ImportReview: ImportReviewParams;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RecipesSearch" component={RecipesScreen} options={{ title: 'Recipes' }} />
      <Stack.Screen name="SavedRecipes" component={SavedRecipesScreen} options={{ title: 'Saved Recipes' }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
      <Stack.Screen name="ImportRecipe" component={ImportRecipeScreen} options={{ title: 'Import Recipe' }} />
      <Stack.Screen name="ImportReview" component={ImportReviewScreen} options={{ title: 'Review Import' }} />
    </Stack.Navigator>
  );
}
