import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  findRecipesByIngredients,
  higherResImage,
  type SpoonacularIngredientMatch,
} from '../../lib/spoonacular';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';
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
        <Button title="Add" onPress={addIngredient} />
      </View>

      {ingredients.length > 0 ? (
        <View style={styles.chipRow}>
          {ingredients.map((ingredient) => (
            <Pressable key={ingredient} style={styles.chip} onPress={() => removeIngredient(ingredient)}>
              <Text style={styles.chipText}>{ingredient}</Text>
              <Ionicons name="close" size={14} color={colors.primaryDark} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button
        title="Find Recipes"
        onPress={handleSearch}
        loading={isSearching}
        disabled={ingredients.length === 0}
        style={{ marginBottom: spacing.sm }}
      />

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
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
  error: { color: colors.error, marginBottom: spacing.sm },
  results: { marginTop: spacing.sm },
  card: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.md },
  cardImage: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceTint },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  cardMatch: { fontSize: 12, color: colors.primaryDark, marginTop: spacing.xs, fontWeight: '600' },
  cardMissing: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
