import { Meal } from '@/storage/meals';
import { colors } from '@/styles/global';
import { calorieAlertText, getCalorieStatus } from '@/utils/calorieAlerts';
import { getTotals } from '@/utils/macros';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function CalorieBanner({ meals }: { meals: Meal[] }) {
  const total = getTotals(meals).calories;
  const status = getCalorieStatus(total);
  const message = calorieAlertText(status, total);

  if (!message) return null;

  const color = status === 'over' ? colors.alert : colors.carbs;

  return (
    <View style={[styles.banner, { borderColor: color }]}>
      <Ionicons
        name={status === 'over' ? 'alert-circle' : 'warning'}
        size={22}
        color={color}
      />
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color }]}>{message.title}</Text>
        <Text style={styles.body}>{message.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800' },
  body: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});