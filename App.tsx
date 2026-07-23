import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.outer}>
          <View style={styles.inner}>
            <RootNavigator />
          </View>
        </View>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? '#e9ecef' : 'transparent',
  },
  inner: Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 480 } : { flex: 1, width: '100%' },
});
