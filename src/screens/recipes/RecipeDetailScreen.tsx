import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, TextInput, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { getRecipeDetail, normalizeRecipe } from '../../lib/spoonacular';
import { confirmAsync } from '../../lib/confirm';
import { colors, radius, spacing } from '../../theme';
import MealTypePillSelector from '../../components/MealTypePillSelector';
import Button from '../../components/Button';
import StatPill from '../../components/StatPill';
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
        <ActivityIndicator size="large" color={colors.primary} />
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {content.image ? <Image source={{ uri: content.image }} style={styles.image} /> : null}
      <Text style={styles.title}>{content.title}</Text>

      {content.sourceUrl ? (
        <Pressable onPress={() => Linking.openURL(content.sourceUrl!)}>
          <Text style={styles.sourceLink}>View original ↗</Text>
        </Pressable>
      ) : null}

      {params.mode === 'spoonacular' ? (
        <Button
          title={saved ? 'Saved' : 'Save Recipe'}
          onPress={handleSave}
          loading={isSaving}
          disabled={saved}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      {params.mode === 'saved' ? (
        <View style={styles.savedActionsRow}>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => navigation.navigate('EditRecipe', { recipeId: params.id })}
            style={{ flex: 1 }}
          />
          <Button
            title="Remove from Saved"
            variant="danger"
            onPress={handleUnsave}
            loading={isUnsaving}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      {unsaveError ? <Text style={styles.error}>{unsaveError}</Text> : null}

      {hasNutrition ? (
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            Nutrition per serving{content.servings ? ` (serves ${content.servings})` : ''}
          </Text>
          <View style={styles.statRow}>
            <StatPill icon="flame-outline" value={`${Math.round(content.caloriesPerServing!)}`} label="cal" />
            {content.proteinPerServingG != null ? (
              <StatPill icon="barbell-outline" value={`${Math.round(content.proteinPerServingG)}g`} label="protein" />
            ) : null}
            {content.carbsPerServingG != null ? (
              <StatPill icon="nutrition-outline" value={`${Math.round(content.carbsPerServingG)}g`} label="carbs" />
            ) : null}
            {content.fatPerServingG != null ? (
              <StatPill icon="water-outline" value={`${Math.round(content.fatPerServingG)}g`} label="fat" />
            ) : null}
          </View>

          <Text style={styles.logLabel}>Log to diary</Text>
          <MealTypePillSelector value={mealType} onChange={setMealType} />
          <View style={styles.logRow}>
            <TextInput
              style={styles.servingsInput}
              value={servingsToLog}
              onChangeText={setServingsToLog}
              keyboardType="decimal-pad"
            />
            <Text style={styles.servingsLabel}>serving(s)</Text>
            <Button
              title={logged ? 'Logged' : 'Add to Diary'}
              onPress={handleLogToDiary}
              loading={isLogging}
              disabled={logged}
              style={styles.logButton}
            />
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
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  image: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceTint, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  sourceLink: { color: colors.primaryDark, fontWeight: '600', marginBottom: spacing.md },
  savedActionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  error: { color: colors.error, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  listItem: { fontSize: 15, color: colors.ink, marginBottom: 6, lineHeight: 21 },
  captionFallbackHint: { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.sm, lineHeight: 17 },
  caption: {
    fontSize: 14,
    color: colors.inkSoft,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    lineHeight: 20,
  },
  nutritionCard: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  nutritionTitle: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  logLabel: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, marginTop: spacing.lg, marginBottom: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  servingsInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlign: 'center',
  },
  servingsLabel: { fontSize: 13, color: colors.inkSoft },
  logButton: { flex: 1 },
});
