import { addMeal, getMeals } from '@/storage/meals';
import { colors, globalStyles, TAB_BAR_SPACE } from '@/styles/global';
import { analyzeMealImage } from '@/utils/ai';
import {
  calorieAlertText,
  getCalorieStatus,
  sendCalorieAlert,
} from '@/utils/calorieAlerts';
import { notify } from '@/utils/dialog';
import { getTotals, isToday } from '@/utils/macros';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  color?: string;
  numeric?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function Field({
  label,
  value,
  onChangeText,
  color = colors.primary,
  numeric,
  placeholder,
  style,
  inputStyle,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, focused && { borderColor: color }, style]}>
      <Text style={[styles.fieldLabel, { color }]}>{label.toUpperCase()}</Text>
      <TextInput
        style={[styles.fieldInput, inputStyle]}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={colors.textSecondary}
        keyboardType={numeric ? 'numeric' : 'default'}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={color}
      />
    </View>
  );
}

// Calories eaten today (only meals logged today count).
const todayCalories = async () =>
  getTotals((await getMeals()).filter((m) => isToday(m.createdAt))).calories;

export default function AddMealScreen() {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  const ready = Boolean(name && calories);

  const scanMeal = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          notify(
            'Camera permission needed',
            'Allow camera access in Settings to take a photo of your meal.',
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.5, // smaller photo = faster and cheaper AI call
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setPhotoUri(asset.uri);

      // On web the base64 may come back as a data URI instead.
      let base64 = asset.base64 ?? '';
      if (!base64 && asset.uri.startsWith('data:')) {
        base64 = asset.uri.split(',')[1] ?? '';
      }
      if (!base64) {
        notify('Photo error', 'Could not read that photo. Try another one.');
        return;
      }

      setAnalyzing(true);
      const estimate = await analyzeMealImage(
        base64,
        asset.mimeType ?? 'image/jpeg',
      );

      setName(estimate.name);
      setCalories(String(estimate.calories));
      setProtein(String(estimate.protein));
      setCarbs(String(estimate.carbs));
      setFat(String(estimate.fat));
      setAiFilled(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.warn('Meal scan failed:', e?.message);
      notify('AI unavailable', e?.message ?? 'Something went wrong.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddMeal = async () => {
    if (!name || !calories) {
      notify('Error', 'Please enter a meal name and calories.');
      return;
    }

    const before = getCalorieStatus(await todayCalories());

    await addMeal({
      name,
      category,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      favorite: false,
      notes: '',
    });

    const total = await todayCalories();
    const after = getCalorieStatus(total);

    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPhotoUri(null);
    setAiFilled(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Warn only when the status gets worse (ok -> near, ok/near -> over).
    const message =
      after !== 'ok' && after !== before ? calorieAlertText(after, total) : null;

    if (message) {
      if (Platform.OS === 'web') {
        notify(message.title, message.body);
      } else {
        await sendCalorieAlert(message.title, message.body);
      }
    } else {
      notify('Success', 'Meal added successfully!');
    }

    router.push('/');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={globalStyles.container}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <Text style={globalStyles.title}>Add Meal</Text>
        <Text style={styles.subtitle}>Snap a photo or type it in.</Text>

        {/* AI scan card */}
        <View style={styles.scanCard}>
          <View style={styles.scanHeader}>
            <View style={styles.sparkle}>
              <Ionicons name='sparkles' size={16} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanTitle}>Scan with AI</Text>
              <Text style={styles.scanSub}>
                Take a photo and get calories and macros automatically.
              </Text>
            </View>
          </View>

          {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}

          {analyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.analyzingText}>Analyzing your meal...</Text>
            </View>
          ) : (
            <View style={styles.scanButtons}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => scanMeal('camera')}
                  activeOpacity={0.85}
                >
                  <Ionicons name='camera' size={18} color={colors.background} />
                  <Text style={styles.scanButtonText}>Take photo</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.scanButton, styles.scanButtonGhost]}
                onPress={() => scanMeal('library')}
                activeOpacity={0.85}
              >
                <Ionicons name='image' size={18} color={colors.primary} />
                <Text style={[styles.scanButtonText, { color: colors.primary }]}>
                  Choose photo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {aiFilled && !analyzing && (
            <Text style={styles.aiNote}>
              AI estimate. Please check the numbers before saving.
            </Text>
          )}
        </View>

        <Field
          label='Meal name'
          value={name}
          onChangeText={setName}
          placeholder='e.g. Chicken adobo'
          style={styles.gap}
        />

        <Field
          label='Calories (kcal)'
          value={calories}
          onChangeText={setCalories}
          numeric
          color={colors.calories}
          style={[styles.gap, styles.hero]}
          inputStyle={styles.heroInput}
        />

        <View style={styles.row}>
          <Field
            label='Protein (g)'
            value={protein}
            onChangeText={setProtein}
            numeric
            color={colors.protein}
            style={styles.tile}
          />
          <Field
            label='Carbs (g)'
            value={carbs}
            onChangeText={setCarbs}
            numeric
            color={colors.carbs}
            style={styles.tile}
          />
          <Field
            label='Fat (g)'
            value={fat}
            onChangeText={setFat}
            numeric
            color={colors.fat}
            style={styles.tile}
          />
        </View>

        <View style={styles.categoryWrap}>
          <Text style={styles.categoryLabel}>Meal type</Text>
          <View style={styles.categoryRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.categoryChip, category === item && styles.categoryChipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, !ready && styles.buttonDim]}
          onPress={handleAddMeal}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Add meal</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },

  scanCard: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sparkle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  scanSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.surfaceHigh,
  },
  scanButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  scanButtonGhost: {
    backgroundColor: 'transparent',
  },
  scanButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  analyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  analyzingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  aiNote: {
    color: colors.carbs,
    fontSize: 12,
    fontWeight: '600',
  },

  gap: {
    marginTop: 20,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  fieldInput: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 6,
  },
  hero: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroInput: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  tile: {
    flex: 1,
    paddingHorizontal: 12,
  },
  categoryWrap: {
    marginTop: 20,
  },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#0A0B0D',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDim: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});