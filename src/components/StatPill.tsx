import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}

export default function StatPill({ icon, value, label }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.onPrimary} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 68 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: { fontSize: 13, fontWeight: '700', color: colors.ink },
  label: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
});
