import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('daily_calorie_goal')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.daily_calorie_goal) setGoal(String(data.daily_calorie_goal));
      });
  }, [session]);

  const saveGoal = async () => {
    if (!session) return;
    setStatus(null);
    const parsed = Number(goal);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus('Enter a valid calorie goal.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ daily_calorie_goal: parsed })
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
        value={goal}
        onChangeText={setGoal}
      />
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Pressable style={styles.button} onPress={saveGoal}>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
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
