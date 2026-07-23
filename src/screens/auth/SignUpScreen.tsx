import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
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

      <Pressable style={styles.button} onPress={handleSignUp} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#2f9e44', textAlign: 'center', marginTop: 16 },
  error: { color: '#e03131', marginBottom: 8 },
  info: { color: '#2f9e44', marginBottom: 8 },
});
