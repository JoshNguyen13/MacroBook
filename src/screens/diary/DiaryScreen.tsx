import { useCallback, useState } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';
import Button from '../../components/Button';
import MacroBar from '../../components/MacroBar';
import FoodLogCard from '../../components/FoodLogCard';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { FoodLog, MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'DiaryHome'>;

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
        <Text style={typography.title}>{totalCalories} cal logged</Text>
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

      <View style={styles.actionRow}>
        <Button title="+ Log Food" onPress={() => navigation.navigate('AddFood')} style={styles.actionButton} />
        <Button
          title="Weekly Summary"
          variant="outline"
          onPress={() => navigation.navigate('WeeklySummary')}
          style={styles.actionButton}
        />
      </View>

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
            <FoodLogCard log={item} onPress={() => navigation.navigate('EditFood', { log: item })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  summaryCard: {
    backgroundColor: colors.surfaceTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  goalText: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.xs },
  macrosSection: { marginTop: spacing.lg, gap: 10 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionButton: { flex: 1 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 32 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
