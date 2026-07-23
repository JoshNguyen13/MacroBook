import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { FoodLog } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'WeeklySummary'>;

interface DayTotal {
  label: string;
  isToday: boolean;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BAR_AREA_HEIGHT = 140;

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function WeeklySummaryScreen(_props: Props) {
  const { session } = useAuth();
  const [days, setDays] = useState<DayTotal[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!session) return;

    const today = startOfDay(new Date());
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - 6);
    const rangeEnd = new Date(today);
    rangeEnd.setHours(23, 59, 59, 999);

    const [logsResult, profileResult] = await Promise.all([
      supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('logged_at', rangeStart.toISOString())
        .lte('logged_at', rangeEnd.toISOString()),
      supabase.from('profiles').select('daily_calorie_goal').eq('id', session.user.id).single(),
    ]);

    setCalorieGoal(profileResult.data?.daily_calorie_goal ?? null);

    const logs: FoodLog[] = logsResult.data ?? [];
    const buckets: DayTotal[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = startOfDay(date).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayLogs = logs.filter((log) => {
        const t = new Date(log.logged_at).getTime();
        return t >= dayStart && t < dayEnd;
      });

      buckets.push({
        label: DAY_LABELS[date.getDay()],
        isToday: i === 0,
        calories: dayLogs.reduce((sum, l) => sum + l.calories, 0),
        proteinG: dayLogs.reduce((sum, l) => sum + (l.protein_g ?? 0), 0),
        carbsG: dayLogs.reduce((sum, l) => sum + (l.carbs_g ?? 0), 0),
        fatG: dayLogs.reduce((sum, l) => sum + (l.fat_g ?? 0), 0),
      });
    }

    setDays(buckets);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const daysWithLogs = days.filter((d) => d.calories > 0).length;
  const avg = (sum: number) => (daysWithLogs > 0 ? Math.round(sum / daysWithLogs) : 0);
  const avgCalories = avg(days.reduce((s, d) => s + d.calories, 0));
  const avgProtein = avg(days.reduce((s, d) => s + d.proteinG, 0));
  const avgCarbs = avg(days.reduce((s, d) => s + d.carbsG, 0));
  const avgFat = avg(days.reduce((s, d) => s + d.fatG, 0));

  const maxValue = Math.max(...days.map((d) => d.calories), calorieGoal ?? 0, 1);
  const goalLineTop = calorieGoal != null ? BAR_AREA_HEIGHT - (calorieGoal / maxValue) * BAR_AREA_HEIGHT : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headlineCard}>
        <Text style={styles.headlineValue}>{avgCalories}</Text>
        <Text style={styles.headlineLabel}>
          avg cal/day{daysWithLogs > 0 ? ` · ${daysWithLogs} day${daysWithLogs === 1 ? '' : 's'} logged` : ''}
        </Text>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.barArea}>
          {goalLineTop != null ? <View style={[styles.goalLine, { top: goalLineTop }]} /> : null}
          <View style={styles.barsRow}>
            {days.map((day, i) => {
              const barHeight = maxValue > 0 ? Math.max(2, (day.calories / maxValue) * BAR_AREA_HEIGHT) : 2;
              const showValue = selectedDay === i || (selectedDay == null && day.isToday);
              return (
                <Pressable
                  key={i}
                  style={styles.barColumn}
                  onPress={() => setSelectedDay(selectedDay === i ? null : i)}
                >
                  <Text style={styles.barValue}>{showValue && day.calories > 0 ? day.calories : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: barHeight }, day.isToday && styles.barToday]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.dayLabelsRow}>
          {days.map((day, i) => (
            <Text key={i} style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
              {day.label}
            </Text>
          ))}
        </View>
        {calorieGoal != null ? <Text style={styles.goalCaption}>┄┄┄ goal: {calorieGoal} cal</Text> : null}
      </View>

      <View style={styles.macroSummaryCard}>
        <Text style={styles.macroSummaryTitle}>Weekly averages</Text>
        <View style={styles.macroSummaryRow}>
          <View style={styles.macroSummaryItem}>
            <Text style={styles.macroSummaryValue}>{avgProtein}g</Text>
            <Text style={styles.macroSummaryLabel}>Protein</Text>
          </View>
          <View style={styles.macroSummaryItem}>
            <Text style={styles.macroSummaryValue}>{avgCarbs}g</Text>
            <Text style={styles.macroSummaryLabel}>Carbs</Text>
          </View>
          <View style={styles.macroSummaryItem}>
            <Text style={styles.macroSummaryValue}>{avgFat}g</Text>
            <Text style={styles.macroSummaryLabel}>Fat</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headlineCard: {
    backgroundColor: '#f4f9f4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  headlineValue: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  headlineLabel: { fontSize: 13, color: '#666', marginTop: 2 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 16,
    marginBottom: 12,
  },
  barArea: { height: BAR_AREA_HEIGHT, position: 'relative' },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#adb5bd',
    borderStyle: 'dashed',
  },
  barsRow: { flexDirection: 'row', height: '100%', alignItems: 'flex-end' },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barValue: { fontSize: 10, color: '#888', marginBottom: 2, height: 14 },
  barTrack: { justifyContent: 'flex-end', alignItems: 'center', flex: 1 },
  bar: {
    width: 18,
    backgroundColor: '#a8d8b0',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barToday: { backgroundColor: '#2f9e44' },
  dayLabelsRow: { flexDirection: 'row', marginTop: 6 },
  dayLabel: { flex: 1, fontSize: 11, color: '#999', textAlign: 'center' },
  dayLabelToday: { color: '#2f9e44', fontWeight: '700' },
  goalCaption: { fontSize: 11, color: '#adb5bd', marginTop: 8, textAlign: 'right' },
  macroSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 16,
  },
  macroSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 12 },
  macroSummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroSummaryItem: { alignItems: 'center' },
  macroSummaryValue: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  macroSummaryLabel: { fontSize: 12, color: '#888', marginTop: 2 },
});
