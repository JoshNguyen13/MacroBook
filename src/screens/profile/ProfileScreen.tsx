import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

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

      <Pressable style={styles.button} onPress={saveGoals}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, marginTop: 16 },
  email: { fontSize: 14, color: '#666', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 6, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1 },
  status: { color: '#2f9e44', marginBottom: 8 },
  button: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOut: { alignItems: 'center', padding: 12 },
  signOutText: { color: '#e03131', fontSize: 15 },
});
