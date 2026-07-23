import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DiaryStack from './DiaryStack';
import RecipesStack from './RecipesStack';
import ProfileScreen from '../screens/profile/ProfileScreen';

export type MainTabParamList = {
  Diary: undefined;
  Recipes: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Diary" component={DiaryStack} />
      <Tab.Screen name="Recipes" component={RecipesStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
