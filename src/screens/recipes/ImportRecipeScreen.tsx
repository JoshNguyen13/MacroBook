import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { importRecipeFromUrl, parseCaption, type ImportedRecipe } from '../../lib/recipeImport';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'ImportRecipe'>;

export default function ImportRecipeScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  const [manualCaption, setManualCaption] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const saveAndOpen = async (result: ImportedRecipe, sourceUrl: string) => {
    if (!session) return;
    const { data, error: insertError } = await supabase
      .from('saved_recipes')
      .insert({
        user_id: session.user.id,
        title: result.title || 'Imported Recipe',
        ingredients: result.ingredients,
        steps: result.steps,
        source_type: result.platform,
        source_url: sourceUrl,
        raw_caption: result.caption,
        image_url: result.image,
        servings: result.macros ? 1 : null,
        calories_per_serving: result.macros?.calories ?? null,
        protein_per_serving_g: result.macros?.proteinG ?? null,
        carbs_per_serving_g: result.macros?.carbsG ?? null,
        fat_per_serving_g: result.macros?.fatG ?? null,
      })
      .select()
      .single();

    if (insertError || !data) {
      throw new Error(insertError?.message ?? 'Failed to save recipe');
    }

    navigation.replace('RecipeDetail', {
      mode: 'saved',
      id: data.id,
      title: data.title,
      image: data.image_url,
      ingredients: result.ingredients,
      steps: result.steps,
      sourceType: data.source_type,
      sourceUrl: data.source_url,
      rawCaption: data.raw_caption,
      servings: data.servings,
      caloriesPerServing: data.calories_per_serving,
      proteinPerServingG: data.protein_per_serving_g,
      carbsPerServingG: data.carbs_per_serving_g,
      fatPerServingG: data.fat_per_serving_g,
    });
  };

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setFetchFailed(false);
    setIsImporting(true);
    try {
      const result = await importRecipeFromUrl(trimmed);
      await saveAndOpen(result, trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setFetchFailed(true);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualParse = async () => {
    const trimmed = manualCaption.trim();
    if (!trimmed) return;
    setManualError(null);
    setIsParsing(true);
    try {
      const result = await parseCaption(trimmed);
      await saveAndOpen(result, url.trim());
    } catch (e) {
      setManualError(e instanceof Error ? e.message : 'Parsing failed');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import a recipe</Text>
      <Text style={styles.subtitle}>Paste a TikTok, Instagram, or YouTube link to a recipe post.</Text>

      <TextInput
        style={styles.input}
        placeholder="https://..."
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Import" onPress={handleImport} loading={isImporting} disabled={!url.trim()} />

      {!fetchFailed ? (
        <Text style={styles.note}>
          We'll try to pull the caption, split it into ingredients and steps, and save it straight to your
          recipes — you can always edit it from there afterward.
        </Text>
      ) : (
        <View style={styles.manualSection}>
          <Text style={styles.manualTitle}>Couldn't fetch that automatically</Text>
          <Text style={styles.manualHint}>
            Open the post, copy its caption, and paste it here instead — we'll still try to parse it into a
            recipe for you.
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Paste the caption text here..."
            value={manualCaption}
            onChangeText={setManualCaption}
            multiline
            textAlignVertical="top"
          />
          {manualError ? <Text style={styles.error}>{manualError}</Text> : null}
          <Button title="Parse Caption" onPress={handleManualParse} loading={isParsing} disabled={!manualCaption.trim()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: spacing.sm },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  multiline: { minHeight: 120 },
  error: { color: colors.error, marginBottom: spacing.md },
  note: { fontSize: 13, color: colors.inkMuted, marginTop: spacing.xl, lineHeight: 19 },
  manualSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  manualHint: { fontSize: 13, color: colors.inkSoft, marginBottom: spacing.md, lineHeight: 18 },
});
