import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { confirmAsync } from '../../lib/confirm';
import { colors, radius, spacing } from '../../theme';
import MealTypePillSelector from '../../components/MealTypePillSelector';
import Button from '../../components/Button';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'EditFood'>;

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
      <MealTypePillSelector value={mealType} onChange={setMealType} />

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

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={isSaving}
        disabled={isDeleting}
        style={{ marginTop: spacing.xl }}
      />
      <Button
        title="Delete Entry"
        onPress={handleDelete}
        loading={isDeleting}
        disabled={isSaving}
        variant="danger"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1 },
  error: { color: colors.error, marginTop: spacing.md },
});
