import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  label: string;
  value: number;
  goal: number | null;
}

export default function MacroBar({ label, value, goal }: Props) {
  const pct = goal ? Math.min(value / goal, 1) : 0;
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(value)}g{goal ? ` / ${goal}g` : ''}
        </Text>
      </View>
      {goal ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkSoft },
  value: { fontSize: 13, color: colors.inkMuted },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTint,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});
