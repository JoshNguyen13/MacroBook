import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, MEAL_TYPE_ICONS } from '../theme';
import type { FoodLog } from '../types/database';

interface Props {
  log: FoodLog;
  onPress: () => void;
}

export default function FoodLogCard({ log, onPress }: Props) {
  const iconName = MEAL_TYPE_ICONS[log.meal_type] as keyof typeof MaterialCommunityIcons.glyphMap;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={iconName} size={20} color={colors.onPrimary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={1}>
          {log.food_name}
        </Text>
        <Text style={styles.calories}>{log.calories} cal</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  calories: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
});
