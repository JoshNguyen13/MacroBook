import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { lookupBarcode, type ScannedProduct } from '../../lib/openFoodFacts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, radius, spacing } from '../../theme';
import MealTypePillSelector from '../../components/MealTypePillSelector';
import Button from '../../components/Button';
import type { DiaryStackParamList } from '../../navigation/DiaryStack';
import type { MealType } from '../../types/database';

type Props = NativeStackScreenProps<DiaryStackParamList, 'BarcodeScan'>;

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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>MacroBook needs camera access to scan barcodes.</Text>
        <Button title="Grant Camera Access" onPress={requestPermission} />
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
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <Text style={styles.overlayText}>Point the camera at a barcode</Text>
          )}
          {lookupError ? (
            <>
              <Text style={styles.overlayError}>{lookupError}</Text>
              <Button title="Scan Again" onPress={reset} style={{ marginTop: spacing.md }} />
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

      <MealTypePillSelector value={mealType} onChange={setMealType} />

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

      <Button title="Add to Diary" onPress={handleLog} loading={isLogging} />

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
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayText: { color: colors.white, fontSize: 15 },
  overlayError: { color: '#ff8787', fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  centeredText: { fontSize: 15, color: colors.ink, textAlign: 'center', marginBottom: spacing.lg },
  resultContainer: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTint,
    marginBottom: spacing.md,
  },
  productName: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: spacing.lg },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  gramsInput: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlign: 'center',
  },
  gramsLabel: { fontSize: 13, color: colors.inkSoft },
  previewText: { fontSize: 13, color: colors.inkMuted, marginBottom: spacing.lg },
  rescanButton: { alignItems: 'center', padding: spacing.md, marginTop: spacing.sm },
  rescanButtonText: { color: colors.primaryDark, fontWeight: '600' },
});
