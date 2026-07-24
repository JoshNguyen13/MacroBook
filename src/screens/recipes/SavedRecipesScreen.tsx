import { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing } from '../../theme';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';
import type { SavedRecipe } from '../../types/database';

type Props = NativeStackScreenProps<RecipesStackParamList, 'SavedRecipes'>;

export default function SavedRecipesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setRecipes(data);
        });
    }, [session])
  );

  const openRecipe = (recipe: SavedRecipe) => {
    navigation.navigate('RecipeDetail', {
      mode: 'saved',
      id: recipe.id,
      title: recipe.title,
      image: recipe.image_url,
      ingredients: (recipe.ingredients as string[]) ?? [],
      steps: (recipe.steps as string[]) ?? [],
      sourceType: recipe.source_type,
      sourceUrl: recipe.source_url,
      rawCaption: recipe.raw_caption,
      servings: recipe.servings,
      caloriesPerServing: recipe.calories_per_serving,
      proteinPerServingG: recipe.protein_per_serving_g,
      carbsPerServingG: recipe.carbs_per_serving_g,
      fatPerServingG: recipe.fat_per_serving_g,
    });
  };

  if (recipes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No saved recipes yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => openRecipe(item)}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.rowImage} />
          ) : (
            <View style={styles.rowImagePlaceholder} />
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Text style={styles.rowSource}>{item.source_type}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyText: { color: colors.inkMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowImage: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceTint, marginRight: spacing.md },
  rowImagePlaceholder: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceTint, marginRight: spacing.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: colors.ink },
  rowSource: { fontSize: 12, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
});
