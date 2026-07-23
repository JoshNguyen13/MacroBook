import { useEffect, useState } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { parseCaption } from '../../lib/recipeImport';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';
import type { SavedRecipe } from '../../types/database';

type Props = NativeStackScreenProps<RecipesStackParamList, 'EditRecipe'>;

function linesToText(lines: string[]) {
  return lines.join('\n');
}

function textToLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toNumberOrNull(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function EditRecipeScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [servings, setServings] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReparsing, setIsReparsing] = useState(false);
  const [reparseError, setReparseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('saved_recipes')
      .select('*')
      .eq('id', recipeId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError || !data) {
          setLoadError(fetchError?.message ?? 'Recipe not found');
          setIsLoading(false);
          return;
        }
        setRecipe(data);
        setTitle(data.title);
        setIngredientsText(linesToText((data.ingredients as string[]) ?? []));
        setStepsText(linesToText((data.steps as string[]) ?? []));
        setServings(data.servings != null ? String(data.servings) : '');
        setCalories(data.calories_per_serving != null ? String(data.calories_per_serving) : '');
        setProtein(data.protein_per_serving_g != null ? String(data.protein_per_serving_g) : '');
        setCarbs(data.carbs_per_serving_g != null ? String(data.carbs_per_serving_g) : '');
        setFat(data.fat_per_serving_g != null ? String(data.fat_per_serving_g) : '');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const handleReparse = async () => {
    if (!recipe?.raw_caption) return;
    setReparseError(null);
    setIsReparsing(true);
    try {
      const result = await parseCaption(recipe.raw_caption, true);
      if (result.ingredients.length === 0 && result.steps.length === 0) {
        setReparseError("AI couldn't find a recipe in this caption either.");
        return;
      }
      setIngredientsText(linesToText(result.ingredients));
      setStepsText(linesToText(result.steps));
    } catch (e) {
      setReparseError(e instanceof Error ? e.message : 'Re-parse failed');
    } finally {
      setIsReparsing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Give the recipe a title.');
      return;
    }
    setError(null);
    setIsSaving(true);
    const { error: updateError } = await supabase
      .from('saved_recipes')
      .update({
        title: title.trim(),
        ingredients: textToLines(ingredientsText),
        steps: textToLines(stepsText),
        servings: toNumberOrNull(servings),
        calories_per_serving: toNumberOrNull(calories),
        protein_per_serving_g: toNumberOrNull(protein),
        carbs_per_serving_g: toNumberOrNull(carbs),
        fat_per_serving_g: toNumberOrNull(fat),
      })
      .eq('id', recipeId);
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loadError || !recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError ?? 'Recipe not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {recipe.image_url ? <Image source={{ uri: recipe.image_url }} style={styles.image} /> : null}

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Ingredients (one per line)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={ingredientsText}
        onChangeText={setIngredientsText}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Steps (one per line)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={stepsText}
        onChangeText={setStepsText}
        multiline
        textAlignVertical="top"
      />

      {recipe.raw_caption ? (
        <>
          <Pressable style={styles.reparseButton} onPress={handleReparse} disabled={isReparsing}>
            {isReparsing ? (
              <ActivityIndicator color="#2f9e44" />
            ) : (
              <Text style={styles.reparseButtonText}>✨ Ingredients/steps not right? Re-parse with AI</Text>
            )}
          </Pressable>
          {reparseError ? <Text style={styles.error}>{reparseError}</Text> : null}
        </>
      ) : null}

      <Text style={styles.label}>Nutrition per serving (optional)</Text>
      <Text style={styles.hint}>
        Fill this in if you want to log servings of this recipe to your diary.
      </Text>
      <View style={styles.nutritionRow}>
        <View style={styles.nutritionField}>
          <Text style={styles.subLabel}>Servings</Text>
          <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="number-pad" />
        </View>
        <View style={styles.nutritionField}>
          <Text style={styles.subLabel}>Calories</Text>
          <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="number-pad" />
        </View>
      </View>
      <View style={styles.nutritionRow}>
        <View style={styles.nutritionField}>
          <Text style={styles.subLabel}>Protein (g)</Text>
          <TextInput style={styles.input} value={protein} onChangeText={setProtein} keyboardType="number-pad" />
        </View>
        <View style={styles.nutritionField}>
          <Text style={styles.subLabel}>Carbs (g)</Text>
          <TextInput style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
        </View>
        <View style={styles.nutritionField}>
          <Text style={styles.subLabel}>Fat (g)</Text>
          <TextInput style={styles.input} value={fat} onChangeText={setFat} keyboardType="number-pad" />
        </View>
      </View>

      {recipe.raw_caption ? (
        <>
          <Text style={styles.label}>Original caption</Text>
          <Text style={styles.caption}>{recipe.raw_caption}</Text>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  image: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eee', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 120 },
  reparseButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f9e44',
    alignItems: 'center',
  },
  reparseButtonText: { color: '#2f9e44', fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 12, color: '#999', marginBottom: 8, lineHeight: 17 },
  nutritionRow: { flexDirection: 'row', gap: 8 },
  nutritionField: { flex: 1 },
  subLabel: { fontSize: 12, color: '#777', marginBottom: 4 },
  caption: {
    fontSize: 13,
    color: '#888',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    lineHeight: 19,
  },
  error: { color: '#e03131', marginTop: 16 },
  saveButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
