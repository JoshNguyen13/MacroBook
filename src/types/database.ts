export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'usda' | 'manual' | 'recipe' | 'barcode';
export type RecipeSourceType = 'spoonacular' | 'youtube' | 'tiktok' | 'instagram' | 'manual';

export type Profile = {
  id: string;
  daily_calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fat_goal_g: number | null;
  created_at: string;
};

export type FoodLog = {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: FoodSource;
  meal_type: MealType;
  logged_at: string;
  created_at: string;
};

export type SavedRecipe = {
  id: string;
  user_id: string;
  title: string;
  ingredients: unknown;
  steps: unknown;
  source_type: RecipeSourceType;
  source_url: string | null;
  raw_caption: string | null;
  image_url: string | null;
  servings: number | null;
  calories_per_serving: number | null;
  protein_per_serving_g: number | null;
  carbs_per_serving_g: number | null;
  fat_per_serving_g: number | null;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      food_logs: {
        Row: FoodLog;
        Insert: Omit<FoodLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<FoodLog, 'id' | 'user_id'>>;
        Relationships: [];
      };
      saved_recipes: {
        Row: SavedRecipe;
        Insert: Omit<SavedRecipe, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<SavedRecipe, 'id' | 'user_id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
