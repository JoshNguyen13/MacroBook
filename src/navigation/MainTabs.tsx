import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DiaryStack from './DiaryStack';
import RecipesStack from './RecipesStack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors, radius, spacing } from '../theme';

export type MainTabParamList = {
  Diary: undefined;
  Recipes: undefined;
  Profile: undefined;
};

const TAB_ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Diary: { active: 'home', inactive: 'home-outline' },
  Recipes: { active: 'search', inactive: 'search-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.onPrimary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <Ionicons name={focused ? icons.active : icons.inactive} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Diary" component={DiaryStack} />
      <Tab.Screen name="Recipes" component={RecipesStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activePill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  inactivePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
