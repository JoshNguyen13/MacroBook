import { useCallback, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { FoodLog, MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'Diary'>;

interface Goals {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

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

function MacroBar({ label, value, goal }: { label: string; value: number; goal: number | null }) {
  const pct = goal ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarLabelRow}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValue}>
          {Math.round(value)}g{goal ? ` / ${goal}g` : ''}
        </Text>
      </View>
      {goal ? (
        <View style={styles.macroBarTrack}>
          <View style={[styles.macroBarFill, { width: `${pct * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

export default function DiaryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<Goals>({ calories: null, proteinG: null, carbsG: null, fatG: null });

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
      supabase
        .from('profiles')
        .select('daily_calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g')
        .eq('id', session.user.id)
        .single(),
    ]);

    if (logsResult.data) setLogs(logsResult.data);
    if (profileResult.data) {
      setGoals({
        calories: profileResult.data.daily_calorie_goal,
        proteinG: profileResult.data.protein_goal_g,
        carbsG: profileResult.data.carbs_goal_g,
        fatG: profileResult.data.fat_goal_g,
      });
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
  const totalProtein = logs.reduce((sum, log) => sum + (log.protein_g ?? 0), 0);
  const totalCarbs = logs.reduce((sum, log) => sum + (log.carbs_g ?? 0), 0);
  const totalFat = logs.reduce((sum, log) => sum + (log.fat_g ?? 0), 0);
  const remaining = goals.calories != null ? goals.calories - totalCalories : null;
  const hasMacroGoals = goals.proteinG != null || goals.carbsG != null || goals.fatG != null;

  const sections = MEAL_ORDER.map((mealType) => ({
    title: mealType[0].toUpperCase() + mealType.slice(1),
    data: logs.filter((log) => log.meal_type === mealType),
  })).filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.totalCalories}>{totalCalories} cal logged</Text>
        <Text style={styles.goalText}>
          {goals.calories != null
            ? remaining! >= 0
              ? `${remaining} remaining of ${goals.calories} goal`
              : `${Math.abs(remaining!)} over ${goals.calories} goal`
            : 'Set a daily calorie goal in Profile'}
        </Text>

        {totalProtein > 0 || totalCarbs > 0 || totalFat > 0 || hasMacroGoals ? (
          <View style={styles.macrosSection}>
            <MacroBar label="Protein" value={totalProtein} goal={goals.proteinG} />
            <MacroBar label="Carbs" value={totalCarbs} goal={goals.carbsG} />
            <MacroBar label="Fat" value={totalFat} goal={goals.fatG} />
          </View>
        ) : null}
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
  macrosSection: { marginTop: 16, gap: 10 },
  macroBarRow: {},
  macroBarLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroBarLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  macroBarValue: { fontSize: 13, color: '#666' },
  macroBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2ede2',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    backgroundColor: '#2f9e44',
    borderRadius: 3,
  },
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
