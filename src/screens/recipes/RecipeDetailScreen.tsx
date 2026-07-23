import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { getRecipeDetail, normalizeRecipe } from '../../lib/spoonacular';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'RecipeDetail'>;

interface RecipeContent {
  title: string;
  image: string | null;
  ingredients: string[];
  steps: string[];
  sourceUrl: string | null;
}

export default function RecipeDetailScreen({ route }: Props) {
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

  useEffect(() => {
    if (params.mode !== 'spoonacular') return;
    let cancelled = false;
    setIsLoading(true);
    getRecipeDetail(params.spoonacularId)
      .then((detail) => {
        if (cancelled) return;
        setContent(normalizeRecipe(detail));
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
    });
    setIsSaving(false);
    if (insertError) {
      setSaveError(insertError.message);
      return;
    }
    setSaved(true);
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

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

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
  error: { color: '#e03131', marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  listItem: { fontSize: 15, marginBottom: 6, lineHeight: 21 },
});
