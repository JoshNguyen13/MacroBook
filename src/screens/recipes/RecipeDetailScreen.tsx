import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { getRecipeDetail, normalizeRecipe } from '../../lib/spoonacular';
import { confirmAsync } from '../../lib/confirm';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<RecipesStackParamList, 'RecipeDetail'>;

interface RecipeContent {
  title: string;
  image: string | null;
  ingredients: string[];
  steps: string[];
  sourceUrl: string | null;
  rawCaption: string | null;
  servings: number | null;
  caloriesPerServing: number | null;
  proteinPerServingG: number | null;
  carbsPerServingG: number | null;
  fatPerServingG: number | null;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const params = route.params;
  const { session } = useAuth();
  const [content, setContent] = useState<RecipeContent | null>(
    params.mode === 'saved' ? params : null
  );
  const [isLoading, setIsLoading] = useState(params.mode === 'spoonacular');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUnsaving, setIsUnsaving] = useState(false);
  const [unsaveError, setUnsaveError] = useState<string | null>(null);

  const [servingsToLog, setServingsToLog] = useState('1');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (params.mode !== 'spoonacular') return;
    let cancelled = false;
    setIsLoading(true);
    getRecipeDetail(params.spoonacularId)
      .then((detail) => {
        if (cancelled) return;
        setContent({ ...normalizeRecipe(detail), rawCaption: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load recipe');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.mode, params.mode === 'spoonacular' ? params.spoonacularId : null]);

  const handleSave = async () => {
    if (!session || !content) return;
    setIsSaving(true);
    setSaveError(null);
    const { error: insertError } = await supabase.from('saved_recipes').insert({
      user_id: session.user.id,
      title: content.title,
      ingredients: content.ingredients,
      steps: content.steps,
      source_type: 'spoonacular',
      source_url: content.sourceUrl,
      raw_caption: null,
      image_url: content.image,
      servings: content.servings,
      calories_per_serving: content.caloriesPerServing,
      protein_per_serving_g: content.proteinPerServingG,
      carbs_per_serving_g: content.carbsPerServingG,
      fat_per_serving_g: content.fatPerServingG,
    });
    setIsSaving(false);
    if (insertError) {
      setSaveError(insertError.message);
      return;
    }
    setSaved(true);
  };

  const performUnsave = async () => {
    if (params.mode !== 'saved') return;
    setIsUnsaving(true);
    setUnsaveError(null);
    const { error: deleteError } = await supabase.from('saved_recipes').delete().eq('id', params.id);
    setIsUnsaving(false);
    if (deleteError) {
      setUnsaveError(deleteError.message);
      return;
    }
    navigation.goBack();
  };

  const handleUnsave = async () => {
    if (!content) return;
    const confirmed = await confirmAsync('Remove recipe?', `Remove "${content.title}" from your saved recipes.`);
    if (confirmed) await performUnsave();
  };

  const handleLogToDiary = async () => {
    if (!session || !content || content.caloriesPerServing == null) return;
    const quantity = Number(servingsToLog);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setLogError('Enter a valid number of servings.');
      return;
    }
    setLogError(null);
    setIsLogging(true);
    const { error: insertError } = await supabase.from('food_logs').insert({
      user_id: session.user.id,
      food_name: content.title,
      calories: Math.round(content.caloriesPerServing * quantity),
      protein_g: content.proteinPerServingG != null ? content.proteinPerServingG * quantity : null,
      carbs_g: content.carbsPerServingG != null ? content.carbsPerServingG * quantity : null,
      fat_g: content.fatPerServingG != null ? content.fatPerServingG * quantity : null,
      source: 'recipe',
      meal_type: mealType,
      logged_at: new Date().toISOString(),
    });
    setIsLogging(false);
    if (insertError) {
      setLogError(insertError.message);
      return;
    }
    setLogged(true);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loadError || !content) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError ?? 'Recipe not found'}</Text>
      </View>
    );
  }

  const hasNutrition = content.caloriesPerServing != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {content.image ? <Image source={{ uri: content.image }} style={styles.image} /> : null}
      <Text style={styles.title}>{content.title}</Text>

      {content.sourceUrl ? (
        <Pressable onPress={() => Linking.openURL(content.sourceUrl!)}>
          <Text style={styles.sourceLink}>View original ↗</Text>
        </Pressable>
      ) : null}

      {params.mode === 'spoonacular' ? (
        <Pressable
          style={[styles.saveButton, saved && styles.saveButtonSaved]}
          onPress={handleSave}
          disabled={isSaving || saved}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{saved ? 'Saved' : 'Save Recipe'}</Text>
          )}
        </Pressable>
      ) : null}

      {params.mode === 'saved' ? (
        <View style={styles.savedActionsRow}>
          <Pressable
            style={styles.editButton}
            onPress={() => navigation.navigate('EditRecipe', { recipeId: params.id })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.unsaveButton} onPress={handleUnsave} disabled={isUnsaving}>
            {isUnsaving ? (
              <ActivityIndicator color="#e03131" />
            ) : (
              <Text style={styles.unsaveButtonText}>Remove from Saved</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      {unsaveError ? <Text style={styles.error}>{unsaveError}</Text> : null}

      {hasNutrition ? (
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            Nutrition per serving{content.servings ? ` (serves ${content.servings})` : ''}
          </Text>
          <Text style={styles.nutritionRow}>{Math.round(content.caloriesPerServing!)} cal</Text>
          <Text style={styles.nutritionRow}>
            {content.proteinPerServingG != null ? `${Math.round(content.proteinPerServingG)}g protein` : ''}
            {content.carbsPerServingG != null ? `  ·  ${Math.round(content.carbsPerServingG)}g carbs` : ''}
            {content.fatPerServingG != null ? `  ·  ${Math.round(content.fatPerServingG)}g fat` : ''}
          </Text>

          <Text style={styles.logLabel}>Log to diary</Text>
          <View style={styles.mealRow}>
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.mealPill, mealType === type && styles.mealPillActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.mealPillText, mealType === type && styles.mealPillTextActive]}>
                  {type[0].toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.logRow}>
            <TextInput
              style={styles.servingsInput}
              value={servingsToLog}
              onChangeText={setServingsToLog}
              keyboardType="decimal-pad"
            />
            <Text style={styles.servingsLabel}>serving(s)</Text>
            <Pressable
              style={[styles.logButton, logged && styles.saveButtonSaved]}
              onPress={handleLogToDiary}
              disabled={isLogging || logged}
            >
              {isLogging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.logButtonText}>{logged ? 'Logged' : 'Add to Diary'}</Text>
              )}
            </Pressable>
          </View>
          {logError ? <Text style={styles.error}>{logError}</Text> : null}
        </View>
      ) : null}

      {content.ingredients.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {content.ingredients.map((ingredient, i) => (
            <Text key={i} style={styles.listItem}>
              • {ingredient}
            </Text>
          ))}
        </>
      ) : null}

      {content.steps.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Steps</Text>
          {content.steps.map((step, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {step}
            </Text>
          ))}
        </>
      ) : null}

      {content.ingredients.length === 0 && content.steps.length === 0 && content.rawCaption ? (
        <>
          <Text style={styles.sectionTitle}>Original Caption</Text>
          <Text style={styles.captionFallbackHint}>
            We couldn't automatically split this into ingredients and steps — here's the original caption.
            You can edit this recipe to fill those in yourself.
          </Text>
          <Text style={styles.caption}>{content.rawCaption}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  image: { width: '100%', height: 220, borderRadius: 10, backgroundColor: '#eee', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sourceLink: { color: '#2f9e44', fontWeight: '600', marginBottom: 12 },
  saveButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonSaved: { backgroundColor: '#868e96' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  savedActionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  editButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f9e44',
  },
  editButtonText: { color: '#2f9e44', fontWeight: '600' },
  unsaveButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e03131',
  },
  unsaveButtonText: { color: '#e03131', fontWeight: '600' },
  error: { color: '#e03131', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  listItem: { fontSize: 15, marginBottom: 6, lineHeight: 21 },
  captionFallbackHint: { fontSize: 12, color: '#999', marginBottom: 8, lineHeight: 17 },
  caption: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  nutritionCard: {
    backgroundColor: '#f4f9f4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  nutritionTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  nutritionRow: { fontSize: 15, marginBottom: 2 },
  logLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 8 },
  mealRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  mealPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  mealPillActive: { backgroundColor: '#2f9e44', borderColor: '#2f9e44' },
  mealPillText: { color: '#333', fontSize: 13 },
  mealPillTextActive: { color: '#fff', fontWeight: '600' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  servingsInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  servingsLabel: { fontSize: 13, color: '#666' },
  logButton: {
    flex: 1,
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  logButtonText: { color: '#fff', fontWeight: '600' },
});
