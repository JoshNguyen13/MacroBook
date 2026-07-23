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
import { searchRecipes, higherResImage, type SpoonacularRecipeSummary } from '../../lib/spoonacular';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'RecipesSearch'>;

export default function RecipesScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpoonacularRecipeSummary[]>([]);
  const [matchedQuery, setMatchedQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError(null);
    setIsSearching(true);
    try {
      const { results: recipes, matchedQuery: matched, originalQuery } = await searchRecipes(query.trim());
      setResults(recipes);
      setMatchedQuery(matched !== originalQuery ? matched : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const openRecipe = (recipe: SpoonacularRecipeSummary) => {
    navigation.navigate('RecipeDetail', {
      mode: 'spoonacular',
      spoonacularId: recipe.id,
      title: recipe.title,
      image: higherResImage(recipe.image),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.input}
          placeholder="Search recipes (e.g. pasta)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <View style={styles.linkRow}>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate('SavedRecipes')}>
          <Text style={styles.actionButtonText}>Saved Recipes</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate('ImportRecipe')}>
          <Text style={styles.actionButtonText}>Import from Link</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate('WhatCanIMake')}>
          <Text style={styles.actionButtonText}>What Can I Make?</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {matchedQuery ? (
        <Text style={styles.relaxedNote}>No exact match — showing results for "{matchedQuery}" instead.</Text>
      ) : null}
      {isSearching ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openRecipe(item)}>
            {item.image ? (
              <Image source={{ uri: higherResImage(item.image) ?? undefined }} style={styles.cardImage} />
            ) : null}
            <Text style={styles.cardTitle}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '600' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  actionButton: {
    flexGrow: 1,
    backgroundColor: '#f4f9f4',
    borderWidth: 1,
    borderColor: '#2f9e44',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#2f9e44', fontWeight: '600', fontSize: 13 },
  error: { color: '#e03131', marginBottom: 8 },
  relaxedNote: { color: '#999', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  card: { marginBottom: 16 },
  cardImage: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginTop: 6 },
});
