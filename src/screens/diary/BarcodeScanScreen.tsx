import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { lookupBarcode, type ScannedProduct } from '../../lib/openFoodFacts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'BarcodeScan'>;

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function BarcodeScanScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [hasScanned, setHasScanned] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [product, setProduct] = useState<ScannedProduct | null>(null);

  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const reset = () => {
    setHasScanned(false);
    setProduct(null);
    setLookupError(null);
    setGrams('100');
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (hasScanned) return;
    setHasScanned(true);
    setLookupError(null);
    setIsLookingUp(true);
    try {
      const result = await lookupBarcode(data);
      if (!result) {
        setLookupError("Couldn't find that product in Open Food Facts.");
        return;
      }
      setProduct(result);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleLog = async () => {
    if (!session || !product) return;
    const gramsNum = Number(grams);
    if (!Number.isFinite(gramsNum) || gramsNum <= 0) {
      setLogError('Enter a valid amount in grams.');
      return;
    }
    setLogError(null);
    setIsLogging(true);
    const factor = gramsNum / 100;
    const { error: insertError } = await supabase.from('food_logs').insert({
      user_id: session.user.id,
      food_name: product.name,
      calories: Math.round((product.caloriesPer100g ?? 0) * factor),
      protein_g: product.proteinPer100gG != null ? product.proteinPer100gG * factor : null,
      carbs_g: product.carbsPer100gG != null ? product.carbsPer100gG * factor : null,
      fat_g: product.fatPer100gG != null ? product.fatPer100gG * factor : null,
      source: 'barcode',
      meal_type: mealType,
      logged_at: new Date().toISOString(),
    });
    setIsLogging(false);
    if (insertError) {
      setLogError(insertError.message);
      return;
    }
    navigation.goBack();
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          Barcode scanning needs a device camera — this only works on a phone or tablet, not in the browser.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>MacroBook needs camera access to scan barcodes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          {isLookingUp ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.overlayText}>Point the camera at a barcode</Text>
          )}
          {lookupError ? (
            <>
              <Text style={styles.overlayError}>{lookupError}</Text>
              <Pressable style={styles.retryButton} onPress={reset}>
                <Text style={styles.buttonText}>Scan Again</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  const factor = (Number(grams) || 0) / 100;

  return (
    <View style={styles.resultContainer}>
      {product.image ? <Image source={{ uri: product.image }} style={styles.productImage} /> : null}
      <Text style={styles.productName}>{product.name}</Text>

      <View style={styles.mealRow}>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.mealPill, mealType === type && styles.mealPillActive]}
            onPress={() => setMealType(type)}
          >
            <Text style={[styles.mealPillText, mealType === type && styles.mealPillTextActive]}>
              {type[0].toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.logRow}>
        <TextInput style={styles.gramsInput} value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
        <Text style={styles.gramsLabel}>grams</Text>
      </View>

      <Text style={styles.previewText}>
        = {Math.round((product.caloriesPer100g ?? 0) * factor)} cal
        {product.proteinPer100gG != null ? ` · ${Math.round(product.proteinPer100gG * factor)}g protein` : ''}
        {product.carbsPer100gG != null ? ` · ${Math.round(product.carbsPer100gG * factor)}g carbs` : ''}
        {product.fatPer100gG != null ? ` · ${Math.round(product.fatPer100gG * factor)}g fat` : ''}
      </Text>

      {logError ? <Text style={styles.overlayError}>{logError}</Text> : null}

      <Pressable style={styles.button} onPress={handleLog} disabled={isLogging}>
        {isLogging ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add to Diary</Text>}
      </Pressable>

      <Pressable style={styles.rescanButton} onPress={reset} disabled={isLogging}>
        <Text style={styles.rescanButtonText}>Scan a different item</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayText: { color: '#fff', fontSize: 15 },
  overlayError: { color: '#ff8787', fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  centeredText: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#2f9e44',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  resultContainer: { flex: 1, backgroundColor: '#fff', padding: 16 },
  productImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#eee', marginBottom: 12 },
  productName: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  mealRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  mealPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mealPillActive: { backgroundColor: '#2f9e44', borderColor: '#2f9e44' },
  mealPillText: { color: '#333', fontSize: 13 },
  mealPillTextActive: { color: '#fff', fontWeight: '600' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gramsInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    textAlign: 'center',
  },
  gramsLabel: { fontSize: 13, color: '#666' },
  previewText: { fontSize: 13, color: '#666', marginBottom: 16 },
  rescanButton: { alignItems: 'center', padding: 12, marginTop: 8 },
  rescanButtonText: { color: '#2f9e44', fontWeight: '600' },
});
