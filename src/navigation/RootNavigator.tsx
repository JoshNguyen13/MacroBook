import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { useAuth } from '../lib/AuthContext';
import { colors } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <NavigationContainer theme={navTheme}>{session ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
