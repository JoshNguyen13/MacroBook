import { useEffect, useState } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { parseCaption } from '../../lib/recipeImport';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';
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
        <ActivityIndicator size="large" color={colors.primary} />
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
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
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <View style={styles.reparseButtonRow}>
                <Ionicons name="sparkles" size={14} color={colors.primaryDark} />
                <Text style={styles.reparseButtonText}>Ingredients/steps not right? Re-parse with AI</Text>
              </View>
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

      <Button title="Save Changes" onPress={handleSave} loading={isSaving} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  image: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.surfaceTint, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  multiline: { minHeight: 120 },
  reparseButton: {
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  reparseButtonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reparseButtonText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm, lineHeight: 17 },
  nutritionRow: { flexDirection: 'row', gap: spacing.sm },
  nutritionField: { flex: 1 },
  subLabel: { fontSize: 12, color: colors.inkSoft, marginBottom: spacing.xs },
  caption: {
    fontSize: 13,
    color: colors.inkMuted,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    lineHeight: 19,
  },
  error: { color: colors.error, marginTop: spacing.lg },
});
