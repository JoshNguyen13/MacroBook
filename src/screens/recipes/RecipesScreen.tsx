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
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError(null);
    setIsSearching(true);
    try {
      const recipes = await searchRecipes(query.trim());
      setResults(recipes);
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
        <Pressable style={styles.savedLink} onPress={() => navigation.navigate('SavedRecipes')}>
          <Text style={styles.savedLinkText}>View saved recipes →</Text>
        </Pressable>
        <Pressable style={styles.savedLink} onPress={() => navigation.navigate('ImportRecipe')}>
          <Text style={styles.savedLinkText}>Import from a link →</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  savedLink: { marginBottom: 12 },
  savedLinkText: { color: '#2f9e44', fontWeight: '600' },
  error: { color: '#e03131', marginBottom: 8 },
  card: { marginBottom: 16 },
  cardImage: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginTop: 6 },
});
