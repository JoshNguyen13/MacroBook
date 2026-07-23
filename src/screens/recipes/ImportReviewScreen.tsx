import { useState } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'ImportReview'>;

function linesToText(lines: string[]) {
  return lines.join('\n');
}

function textToLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ImportReviewScreen({ route, navigation }: Props) {
  const { platform, image, caption, sourceUrl } = route.params;
  const { session } = useAuth();

  const [title, setTitle] = useState(route.params.title);
  const [ingredientsText, setIngredientsText] = useState(linesToText(route.params.ingredients));
  const [stepsText, setStepsText] = useState(linesToText(route.params.steps));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!session) return;
    const ingredients = textToLines(ingredientsText);
    const steps = textToLines(stepsText);

    if (!title.trim()) {
      setError('Give the recipe a title.');
      return;
    }

    setError(null);
    setIsSaving(true);
    const { error: insertError } = await supabase.from('saved_recipes').insert({
      user_id: session.user.id,
      title: title.trim(),
      ingredients,
      steps,
      source_type: platform,
      source_url: sourceUrl,
      raw_caption: caption,
      image_url: image,
    });
    setIsSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.popToTop();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {image ? <Image source={{ uri: image }} style={styles.image} /> : null}

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

      <Text style={styles.label}>Original caption</Text>
      <Text style={styles.caption}>{caption}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Recipe</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
