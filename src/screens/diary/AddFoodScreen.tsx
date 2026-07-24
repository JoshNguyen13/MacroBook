import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { searchUsdaFoods, type UsdaFoodResult } from '../../lib/usda';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing } from '../../theme';
import MealTypePillSelector from '../../components/MealTypePillSelector';
import Button from '../../components/Button';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'AddFood'>;

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
      <MealTypePillSelector value={mealType} onChange={setMealType} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search foods (e.g. chicken breast)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

      <Pressable style={styles.scanButton} onPress={() => navigation.navigate('BarcodeScan')}>
        <Ionicons name="camera-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isSearching ? <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} /> : null}

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
                <Ionicons
                  name={isSelected ? 'chevron-up' : 'add-circle-outline'}
                  size={22}
                  color={colors.primaryDark}
                />
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
                    <Button
                      title="Add"
                      onPress={handleLog}
                      loading={isLogging}
                      style={styles.logButton}
                    />
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
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: spacing.lg,
  },
  scanButtonText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },
  error: { color: colors.error, marginBottom: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: { fontSize: 15, fontWeight: '500', color: colors.ink },
  resultMacros: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  logCard: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  servingsInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlign: 'center',
  },
  servingsLabel: { fontSize: 13, color: colors.inkSoft },
  logButton: { flex: 1 },
  previewText: { fontSize: 12, color: colors.inkMuted, marginTop: spacing.sm },
});
