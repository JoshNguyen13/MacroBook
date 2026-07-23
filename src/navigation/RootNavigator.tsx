import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <NavigationContainer>{session ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
