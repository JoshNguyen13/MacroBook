import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import Button from '../../components/Button';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);
    setIsLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setIsLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setInfo('Check your email to confirm your account, then log in.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start tracking with MacroBook</Text>

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
        placeholder="Password (min 6 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <Button title="Sign Up" onPress={handleSignUp} loading={isLoading} style={{ marginTop: spacing.sm }} />

      <Pressable onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: '800', color: colors.primaryDark, textAlign: 'center', marginBottom: spacing.xs },
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
  info: { color: colors.primaryDark, marginBottom: spacing.sm },
});
