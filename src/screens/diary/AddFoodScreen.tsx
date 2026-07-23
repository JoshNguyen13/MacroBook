import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { searchUsdaFoods, type UsdaFoodResult } from '../../lib/usda';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'AddFood'>;

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function AddFoodScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [results, setResults] = useState<UsdaFoodResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError(null);
    setIsSearching(true);
    try {
      const foods = await searchUsdaFoods(query.trim());
      setResults(foods);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLog = async (food: UsdaFoodResult) => {
    if (!session) return;
    setLoggingId(food.fdcId);
    const { error: insertError } = await supabase.from('food_logs').insert({
      user_id: session.user.id,
      food_name: food.description,
      calories: Math.round(food.calories),
      protein_g: food.proteinG,
      carbs_g: food.carbsG,
      fat_g: food.fatG,
      source: 'usda',
      meal_type: mealType,
      logged_at: new Date().toISOString(),
    });
    setLoggingId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.mealRow}>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.mealPill, mealType === type && styles.mealPillActive]}
            onPress={() => setMealType(type)}
          >
            <Text style={[styles.mealPillText, mealType === type && styles.mealPillTextActive]}>
              {type[0].toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search foods (e.g. chicken breast)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSearching ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.fdcId)}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => handleLog(item)} disabled={loggingId === item.fdcId}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.description}</Text>
              <Text style={styles.resultMacros}>
                {Math.round(item.calories)} cal
                {item.proteinG != null ? ` · ${Math.round(item.proteinG)}g protein` : ''}
              </Text>
            </View>
            {loggingId === item.fdcId ? <ActivityIndicator /> : <Text style={styles.addLabel}>Add</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  mealRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  mealPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mealPillActive: { backgroundColor: '#2f9e44', borderColor: '#2f9e44' },
  mealPillText: { color: '#333', fontSize: 13 },
  mealPillTextActive: { color: '#fff', fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  error: { color: '#e03131', marginBottom: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultName: { fontSize: 15, fontWeight: '500' },
  resultMacros: { fontSize: 13, color: '#666', marginTop: 2 },
  addLabel: { color: '#2f9e44', fontWeight: '600' },
});
