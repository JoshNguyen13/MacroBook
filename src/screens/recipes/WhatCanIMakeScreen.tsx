import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  findRecipesByIngredients,
  higherResImage,
  type SpoonacularIngredientMatch,
} from '../../lib/spoonacular';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'WhatCanIMake'>;

export default function WhatCanIMakeScreen({ navigation }: Props) {
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<SpoonacularIngredientMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (!trimmed || ingredients.includes(trimmed)) return;
    setIngredients([...ingredients, trimmed]);
    setIngredientInput('');
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) return;
    setError(null);
    setIsSearching(true);
    try {
      const matches = await findRecipesByIngredients(ingredients);
      setResults(matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const openRecipe = (recipe: SpoonacularIngredientMatch) => {
    navigation.navigate('RecipeDetail', {
      mode: 'spoonacular',
      spoonacularId: recipe.id,
      title: recipe.title,
      image: higherResImage(recipe.image),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Add what you have on hand, and we'll find recipes that use it.</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. chicken"
          value={ingredientInput}
          onChangeText={setIngredientInput}
          onSubmitEditing={addIngredient}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addIngredient}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {ingredients.length > 0 ? (
        <View style={styles.chipRow}>
          {ingredients.map((ingredient) => (
            <Pressable key={ingredient} style={styles.chip} onPress={() => removeIngredient(ingredient)}>
              <Text style={styles.chipText}>{ingredient} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        style={[styles.searchButton, ingredients.length === 0 && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={ingredients.length === 0 || isSearching}
      >
        {isSearching ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.searchButtonText}>Find Recipes</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        style={styles.results}
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openRecipe(item)}>
            {item.image ? (
              <Image source={{ uri: higherResImage(item.image) ?? undefined }} style={styles.cardImage} />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMatch}>
                Uses {item.usedIngredientCount} of what you have
                {item.missedIngredientCount > 0 ? ` · missing ${item.missedIngredientCount}` : ''}
              </Text>
              {item.missedIngredients.length > 0 ? (
                <Text style={styles.cardMissing}>
                  Missing: {item.missedIngredients.map((m) => m.name).join(', ')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: '#f4f9f4',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: '#2f9e44', fontSize: 13, fontWeight: '600' },
  searchButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  searchButtonDisabled: { backgroundColor: '#adb5bd' },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#e03131', marginBottom: 8 },
  results: { marginTop: 8 },
  card: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  cardImage: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#eee' },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardMatch: { fontSize: 12, color: '#2f9e44', marginTop: 4, fontWeight: '600' },
  cardMissing: { fontSize: 12, color: '#999', marginTop: 2 },
});
