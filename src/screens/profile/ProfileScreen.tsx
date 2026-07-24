import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbsGoal, setCarbsGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('daily_calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.daily_calorie_goal) setCalorieGoal(String(data.daily_calorie_goal));
        if (data.protein_goal_g) setProteinGoal(String(data.protein_goal_g));
        if (data.carbs_goal_g) setCarbsGoal(String(data.carbs_goal_g));
        if (data.fat_goal_g) setFatGoal(String(data.fat_goal_g));
      });
  }, [session]);

  const toNumberOrNull = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const saveGoals = async () => {
    if (!session) return;
    setStatus(null);

    if (calorieGoal.trim() && toNumberOrNull(calorieGoal) == null) {
      setStatus('Enter a valid calorie goal.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        daily_calorie_goal: toNumberOrNull(calorieGoal),
        protein_goal_g: toNumberOrNull(proteinGoal),
        carbs_goal_g: toNumberOrNull(carbsGoal),
        fat_goal_g: toNumberOrNull(fatGoal),
      })
      .eq('id', session.user.id);
    setStatus(error ? error.message : 'Saved!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <Text style={styles.label}>Daily calorie goal</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2000"
        keyboardType="number-pad"
        value={calorieGoal}
        onChangeText={setCalorieGoal}
      />

      <Text style={styles.sectionLabel}>Daily macro goals (optional)</Text>
      <View style={styles.macroRow}>
        <View style={styles.macroField}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 150"
            keyboardType="number-pad"
            value={proteinGoal}
            onChangeText={setProteinGoal}
          />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 200"
            keyboardType="number-pad"
            value={carbsGoal}
            onChangeText={setCarbsGoal}
          />
        </View>
        <View style={styles.macroField}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 65"
            keyboardType="number-pad"
            value={fatGoal}
            onChangeText={setFatGoal}
          />
        </View>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Button title="Save" onPress={saveGoals} style={{ marginBottom: spacing.xl }} />

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs, marginTop: spacing.lg },
  email: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.xl },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSoft, marginTop: spacing.sm, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1 },
  status: { color: colors.primaryDark, marginBottom: spacing.sm },
  signOut: { alignItems: 'center', padding: spacing.md },
  signOutText: { color: colors.error, fontSize: 15 },
});
