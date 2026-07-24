import { Pressable, Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      style={[styles.base, variantStyles[variant].container, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color as string} />
      ) : (
        <Text style={[styles.text, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.onPrimary },
  },
  secondary: {
    container: { backgroundColor: colors.surfaceTint },
    text: { color: colors.ink },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
    text: { color: colors.primaryDark },
  },
  danger: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error },
    text: { color: colors.error },
  },
} as const;
