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

  const [selectedFood, setSelectedFood] = useState<UsdaFoodResult | null>(null);
  const [servings, setServings] = useState('1');
  const [isLogging, setIsLogging] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError(null);
    setIsSearching(true);
    try {
      const foods = await searchUsdaFoods(query.trim());
      setResults(foods);
      setSelectedFood(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const selectFood = (food: UsdaFoodResult) => {
    setSelectedFood(food);
    setServings('1');
    setError(null);
  };

  const handleLog = async () => {
    if (!session || !selectedFood) return;
    const quantity = Number(servings);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter a valid number of servings.');
      return;
    }
    setError(null);
    setIsLogging(true);
    const { error: insertError } = await supabase.from('food_logs').insert({
      user_id: session.user.id,
      food_name: selectedFood.description,
      calories: Math.round(selectedFood.calories * quantity),
      protein_g: selectedFood.proteinG != null ? selectedFood.proteinG * quantity : null,
      carbs_g: selectedFood.carbsG != null ? selectedFood.carbsG * quantity : null,
      fat_g: selectedFood.fatG != null ? selectedFood.fatG * quantity : null,
      source: 'usda',
      meal_type: mealType,
      logged_at: new Date().toISOString(),
    });
    setIsLogging(false);
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

      <Pressable style={styles.scanButton} onPress={() => navigation.navigate('BarcodeScan')}>
        <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSearching ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.fdcId)}
        renderItem={({ item }) => {
          const isSelected = selectedFood?.fdcId === item.fdcId;
          return (
            <View>
              <Pressable style={styles.resultRow} onPress={() => selectFood(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{item.description}</Text>
                  <Text style={styles.resultMacros}>
                    {Math.round(item.calories)} cal per serving
                    {item.proteinG != null ? ` · ${Math.round(item.proteinG)}g protein` : ''}
                  </Text>
                </View>
                <Text style={styles.addLabel}>{isSelected ? '▲' : 'Select'}</Text>
              </Pressable>

              {isSelected ? (
                <View style={styles.logCard}>
                  <View style={styles.logRow}>
                    <TextInput
                      style={styles.servingsInput}
                      value={servings}
                      onChangeText={setServings}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.servingsLabel}>serving(s)</Text>
                    <Pressable style={styles.logButton} onPress={handleLog} disabled={isLogging}>
                      {isLogging ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.logButtonText}>Add</Text>
                      )}
                    </Pressable>
                  </View>
                  <Text style={styles.previewText}>
                    = {Math.round(item.calories * (Number(servings) || 0))} cal
                    {item.proteinG != null
                      ? ` · ${Math.round(item.proteinG * (Number(servings) || 0))}g protein`
                      : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
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
  scanButton: {
    borderWidth: 1,
    borderColor: '#2f9e44',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: { color: '#2f9e44', fontWeight: '600', fontSize: 14 },
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
  logCard: {
    backgroundColor: '#f4f9f4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  servingsInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  servingsLabel: { fontSize: 13, color: '#666' },
  logButton: {
    flex: 1,
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  logButtonText: { color: '#fff', fontWeight: '600' },
  previewText: { fontSize: 12, color: '#666', marginTop: 8 },
});
