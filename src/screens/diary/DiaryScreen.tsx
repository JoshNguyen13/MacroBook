import { useCallback, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { FoodLog, MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'Diary'>;

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function DiaryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!session) return;

    const [logsResult, profileResult] = await Promise.all([
      supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('logged_at', startOfTodayIso())
        .lte('logged_at', endOfTodayIso())
        .order('logged_at', { ascending: true }),
      supabase.from('profiles').select('daily_calorie_goal').eq('id', session.user.id).single(),
    ]);

    if (logsResult.data) setLogs(logsResult.data);
    if (profileResult.data) setCalorieGoal(profileResult.data.daily_calorie_goal);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
  const remaining = calorieGoal != null ? calorieGoal - totalCalories : null;

  const sections = MEAL_ORDER.map((mealType) => ({
    title: mealType[0].toUpperCase() + mealType.slice(1),
    data: logs.filter((log) => log.meal_type === mealType),
  })).filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.totalCalories}>{totalCalories} cal logged</Text>
        <Text style={styles.goalText}>
          {calorieGoal != null
            ? remaining! >= 0
              ? `${remaining} remaining of ${calorieGoal} goal`
              : `${Math.abs(remaining!)} over ${calorieGoal} goal`
            : 'Set a daily calorie goal in Profile'}
        </Text>
      </View>

      <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddFood')}>
        <Text style={styles.addButtonText}>+ Log Food</Text>
      </Pressable>

      {sections.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet today.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable style={styles.logRow} onPress={() => navigation.navigate('EditFood', { log: item })}>
              <Text style={styles.logName}>{item.food_name}</Text>
              <Text style={styles.logCalories}>{item.calories} cal</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  summaryCard: {
    backgroundColor: '#f4f9f4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  totalCalories: { fontSize: 24, fontWeight: '700' },
  goalText: { fontSize: 14, color: '#666', marginTop: 4 },
  addButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logName: { fontSize: 15 },
  logCalories: { fontSize: 15, color: '#666' },
});
