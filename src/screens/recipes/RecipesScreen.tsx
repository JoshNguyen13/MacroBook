import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { searchRecipes, higherResImage, type SpoonacularRecipeSummary } from '../../lib/spoonacular';
import { colors, radius, spacing } from '../../theme';
import RecipeCard from '../../components/RecipeCard';
import Button from '../../components/Button';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type Props = NativeStackScreenProps<RecipesStackParamList, 'RecipesSearch'>;

export default function RecipesScreen({ navigation }: Props) {
  const ACTIONS: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    { key: 'SavedRecipes', label: 'Saved Recipes', icon: 'bookmark-outline', onPress: () => navigation.navigate('SavedRecipes') },
    { key: 'ImportRecipe', label: 'Import from Link', icon: 'link-outline', onPress: () => navigation.navigate('ImportRecipe') },
    { key: 'WhatCanIMake', label: 'What Can I Make?', icon: 'bulb-outline', onPress: () => navigation.navigate('WhatCanIMake') },
  ];
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
        <Button title="Search" onPress={handleSearch} />
      </View>

      <View style={styles.linkRow}>
        {ACTIONS.map((action) => (
          <Pressable key={action.key} style={styles.actionChip} onPress={action.onPress}>
            <Ionicons name={action.icon} size={18} color={colors.primaryDark} />
            <Text style={styles.actionChipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {matchedQuery ? (
        <Text style={styles.relaxedNote}>No exact match — showing results for "{matchedQuery}" instead.</Text>
      ) : null}
      {isSearching ? <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <RecipeCard
            title={item.title}
            image={item.image ? higherResImage(item.image) : null}
            onPress={() => openRecipe(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  actionChip: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  actionChipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  error: { color: colors.error, marginBottom: spacing.sm },
  relaxedNote: { color: colors.inkMuted, fontSize: 12, marginBottom: spacing.sm, fontStyle: 'italic' },
});
