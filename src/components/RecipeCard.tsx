import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  title: string;
  image: string | null;
  subtitle?: string;
  onPress: () => void;
}

export default function RecipeCard({ title, image, subtitle, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  image: { width: '100%', height: 160, borderRadius: radius.lg, backgroundColor: colors.surfaceTint },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceTint,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: spacing.sm },
  subtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
});
