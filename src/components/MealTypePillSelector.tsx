import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { MealType } from '../types/database';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface Props {
  value: MealType;
  onChange: (mealType: MealType) => void;
}

export default function MealTypePillSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {MEAL_TYPES.map((type) => {
        const active = value === type;
        return (
          <Pressable
            key={type}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(type)}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {type[0].toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.inkSoft, fontSize: 13 },
  pillTextActive: { color: colors.onPrimary, fontWeight: '600' },
});
