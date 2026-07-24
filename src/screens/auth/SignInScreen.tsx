import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MacroBook</Text>
      <Text style={styles.subtitle}>Log in to track your meals</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Log In" onPress={handleSignIn} loading={isLoading} style={{ marginTop: spacing.sm }} />

      <Pressable onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.link}>Don&apos;t have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { fontSize: 40, fontWeight: '800', color: colors.primaryDark, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.inkSoft, textAlign: 'center', marginBottom: spacing.xxl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  link: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.lg },
  error: { color: colors.error, marginBottom: spacing.sm },
});
