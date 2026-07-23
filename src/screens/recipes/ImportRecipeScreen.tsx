import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { importRecipeFromUrl } from '../../lib/recipeImport';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'ImportRecipe'>;

export default function ImportRecipeScreen({ navigation }: Props) {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setIsImporting(true);
    try {
      const result = await importRecipeFromUrl(trimmed);
      navigation.replace('ImportReview', {
        platform: result.platform,
        title: result.title,
        image: result.image,
        caption: result.caption,
        ingredients: result.ingredients,
        steps: result.steps,
        sourceUrl: trimmed,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
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

      <Pressable style={styles.button} onPress={handleImport} disabled={isImporting || !url.trim()}>
        {isImporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Import</Text>}
      </Pressable>

      <Text style={styles.note}>
        We'll try to pull the caption and split it into ingredients and steps automatically. You'll get a
        chance to review and edit everything before it's saved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#e03131', marginBottom: 12 },
  button: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  note: { fontSize: 13, color: '#999', marginTop: 20, lineHeight: 19 },
});
