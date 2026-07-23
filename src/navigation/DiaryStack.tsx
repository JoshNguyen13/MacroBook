import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiaryScreen from '../screens/diary/DiaryScreen';
import AddFoodScreen from '../screens/diary/AddFoodScreen';
import EditFoodScreen from '../screens/diary/EditFoodScreen';
import BarcodeScanScreen from '../screens/diary/BarcodeScanScreen';
import type { FoodLog } from '../types/database';

export type DiaryStackParamList = {
  Diary: undefined;
  AddFood: undefined;
  EditFood: { log: FoodLog };
  BarcodeScan: undefined;
};

const Stack = createNativeStackNavigator<DiaryStackParamList>();

export default function DiaryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Diary" component={DiaryScreen} options={{ title: 'Today' }} />
      <Stack.Screen name="AddFood" component={AddFoodScreen} options={{ title: 'Add Food' }} />
      <Stack.Screen name="EditFood" component={EditFoodScreen} options={{ title: 'Edit Entry' }} />
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} options={{ title: 'Scan Barcode' }} />
    </Stack.Navigator>
  );
}
