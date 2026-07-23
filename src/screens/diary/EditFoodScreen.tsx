import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { confirmAsync } from '../../lib/confirm';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'EditFood'>;

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function EditFoodScreen({ route, navigation }: Props) {
  const { log } = route.params;
  const [foodName, setFoodName] = useState(log.food_name);
  const [calories, setCalories] = useState(String(log.calories));
  const [proteinG, setProteinG] = useState(log.protein_g != null ? String(log.protein_g) : '');
  const [carbsG, setCarbsG] = useState(log.carbs_g != null ? String(log.carbs_g) : '');
  const [fatG, setFatG] = useState(log.fat_g != null ? String(log.fat_g) : '');
  const [mealType, setMealType] = useState<MealType>(log.meal_type);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const parsedCalories = Number(calories);
    if (!foodName.trim() || !Number.isFinite(parsedCalories) || parsedCalories < 0) {
      setError('Enter a food name and a valid calorie amount.');
      return;
    }
    setError(null);
    setIsSaving(true);
    const { error: updateError } = await supabase
      .from('food_logs')
      .update({
        food_name: foodName.trim(),
        calories: Math.round(parsedCalories),
        protein_g: proteinG ? Number(proteinG) : null,
        carbs_g: carbsG ? Number(carbsG) : null,
        fat_g: fatG ? Number(fatG) : null,
        meal_type: mealType,
      })
      .eq('id', log.id);
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigation.goBack();
  };

  const performDelete = async () => {
    setIsDeleting(true);
    const { error: deleteError } = await supabase.from('food_logs').delete().eq('id', log.id);
    setIsDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    navigation.goBack();
  };

  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete entry?', `Remove "${log.food_name}" from your diary.`);
    if (confirmed) await performDelete();
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

      <Text style={styles.label}>Food name</Text>
      <TextInput style={styles.input} value={foodName} onChangeText={setFoodName} />

      <Text style={styles.label}>Calories</Text>
      <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="number-pad" />

      <View style={styles.macroRow}>
        <View style={styles.macroField}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput style={styles.input} value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput style={styles.input} value={carbsG} onChangeText={setCarbsG} keyboardType="number-pad" />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput style={styles.input} value={fatG} onChangeText={setFatG} keyboardType="number-pad" />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving || isDeleting}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={isSaving || isDeleting}>
        {isDeleting ? (
          <ActivityIndicator color="#e03131" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete Entry</Text>
        )}
      </Pressable>
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
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1 },
  error: { color: '#e03131', marginTop: 12 },
  saveButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  deleteButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e03131',
  },
  deleteButtonText: { color: '#e03131', fontWeight: '600', fontSize: 15 },
});
