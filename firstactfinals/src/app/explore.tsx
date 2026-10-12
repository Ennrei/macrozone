import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  loadNutritionData,
  localDateKey,
  NutritionMeal,
  sumMacros,
} from '@/storage/nutrition';

type DayTotal = { date: string; calories: number; meals: number };

function makeDayTotals(meals: NutritionMeal[], now: Date): DayTotal[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    const key = localDateKey(date);
    const entries = meals.filter((meal) => localDateKey(meal.loggedAt) === key);
    return {
      date: key,
      calories: sumMacros(entries).calories,
      meals: entries.length,
    };
  });
}

export default function ExploreScreen() {
  const styles = makeStyles();
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    let mounted = true;
    loadNutritionData()
      .then((stored) => {
        if (mounted) {
          setMeals(stored.meals);
          setError(stored.syncError ?? '');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Could not load nutrition insights:', loadError);
        if (mounted) setError('Nutrition insights could not be loaded.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const retrySync = async () => {
    setLoading(true);
    try {
      const stored = await loadNutritionData();
      setMeals(stored.meals);
      setError(stored.syncError ?? '');
    } catch (syncError) {
      console.error('Could not retry MacroZone insights synchronization:', syncError);
      setError('Could not retry backend synchronization.');
    } finally {
      setLoading(false);
    }
  };

  const week = useMemo(() => makeDayTotals(meals, new Date()), [meals]);
  const weeklyAverage = Math.round(week.reduce((sum, day) => sum + day.calories, 0) / week.length);
  const activeDays = week.filter((day) => day.meals > 0).length;
  const maxCalories = Math.max(...week.map((day) => day.calories), 1);

  const monthEntries = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const slots: { day: number | null; calories: number }[] = [
      ...Array.from({ length: firstWeekday }, () => ({ day: null, calories: 0 })),
      ...Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const key = localDateKey(new Date(year, monthIndex, day));
        return {
          day,
          calories: sumMacros(meals.filter((meal) => localDateKey(meal.loggedAt) === key)).calories,
        };
      }),
    ];
    while (slots.length % 7 !== 0) slots.push({ day: null, calories: 0 });
    return slots;
  }, [meals, month]);

  const categories = useMemo(() => {
    const totals = new Map<string, { calories: number; meals: number }>();
    meals.forEach((meal) => {
      const current = totals.get(meal.category) ?? { calories: 0, meals: 0 };
      current.calories += meal.calories;
      current.meals += 1;
      totals.set(meal.category, current);
    });
    return Array.from(totals.entries())
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.calories - a.calories);
  }, [meals]);

  const frequentMeals = useMemo(() => {
    const groups = new Map<string, { count: number; calories: number; protein: number; carbs: number; fat: number }>();
    meals.forEach((meal) => {
      const key = meal.name.trim().toLocaleLowerCase();
      const current = groups.get(key) ?? { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
      current.count += 1;
      current.calories += meal.calories;
      current.protein += meal.protein;
      current.carbs += meal.carbs;
      current.fat += meal.fat;
      groups.set(key, current);
    });
    return Array.from(groups.entries())
      .map(([key, totals]) => ({
        key,
        name: meals.find((meal) => meal.name.trim().toLocaleLowerCase() === key)?.name ?? key,
        ...totals,
        avgCalories: Math.round(totals.calories / totals.count),
      }))
      .sort((a, b) => b.count - a.count || b.calories - a.calories)
      .slice(0, 8);
  }, [meals]);

  const shiftMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle" style={styles.title}>Insights</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Nutrition patterns from the meals you have logged.
          </ThemedText>

          {error ? (
            <View style={styles.syncWarning}>
              <ThemedText style={styles.error}>{error}</ThemedText>
              <Pressable onPress={() => void retrySync()} disabled={loading}>
                <ThemedText type="smallBold" style={styles.linkAccent}>Retry sync</ThemedText>
              </Pressable>
            </View>
          ) : null}
          {loading ? (
            <ActivityIndicator accessibilityLabel="Loading nutrition insights" />
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Last seven days</ThemedText>
                <View style={styles.weekSummary}>
                  <View style={styles.weekMetric}>
                    <ThemedText type="subtitle" style={styles.metricValue}>{weeklyAverage}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">average kcal / day</ThemedText>
                  </View>
                  <View style={styles.weekMetric}>
                    <ThemedText type="subtitle" style={styles.metricValue}>{activeDays}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">days with meals</ThemedText>
                  </View>
                </View>
                <View style={styles.chart}>
                  {week.map((day) => (
                    <View key={day.date} style={styles.chartDay}>
                      <View style={styles.barArea}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max(day.calories > 0 ? 5 : 0, (day.calories / maxCalories) * 100)}%`,
                              backgroundColor: '#C6FF3D',
                            },
                          ]}
                        />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
                      </ThemedText>
                      <ThemedText type="small">{day.calories ? Math.round(day.calories) : '–'}</ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.monthHeader}>
                  <ThemedText type="smallBold">Meal calendar</ThemedText>
                  <View style={styles.monthControls}>
                    <MonthButton label="‹" onPress={() => shiftMonth(-1)} />
                    <ThemedText type="smallBold">
                      {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </ThemedText>
                    <MonthButton label="›" onPress={() => shiftMonth(1)} />
                  </View>
                </View>
                <View style={styles.calendar}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => (
                    <View key={`${weekday}-${index}`} style={styles.calendarCell}>
                      <ThemedText type="small" themeColor="textSecondary">{weekday}</ThemedText>
                    </View>
                  ))}
                  {monthEntries.map((entry, index) => (
                    <View
                      key={`${month.getFullYear()}-${month.getMonth()}-${index}`}
                      style={[
                        styles.calendarCell,
                        entry.calories > 0 && styles.calendarLogged,
                      ]}
                    >
                      <ThemedText type="small" themeColor={entry.calories > 0 ? 'text' : 'textSecondary'}>
                        {entry.day ?? ''}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Calories by meal category</ThemedText>
                {categories.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">Log meals to see a category breakdown.</ThemedText>
                ) : (
                  categories.map((item) => (
                    <View key={item.category} style={styles.dataRow}>
                      <View>
                        <ThemedText type="smallBold" style={styles.capitalize}>{item.category}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">{item.meals} logged</ThemedText>
                      </View>
                      <ThemedText type="smallBold">{Math.round(item.calories)} kcal</ThemedText>
                    </View>
                  ))
                )}
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Frequently logged meals</ThemedText>
                {frequentMeals.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">Repeated meals will appear here.</ThemedText>
                ) : (
                  frequentMeals.map((item) => (
                    <View key={item.key} style={styles.dataRow}>
                      <View style={styles.foodDetails}>
                        <ThemedText type="smallBold" numberOfLines={1}>{item.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.count} entries · avg {item.avgCalories} kcal · P {Math.round(item.protein / item.count)}g · C {Math.round(item.carbs / item.count)}g · F {Math.round(item.fat / item.count)}g
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold">{Math.round(item.calories)} kcal</ThemedText>
                    </View>
                  ))
                )}
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function MonthButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label === '‹' ? 'Previous month' : 'Next month'} style={stylesStatic.monthButton}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const stylesStatic = StyleSheet.create({
  monthButton: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#1C1F25', borderRadius: 9 },
});

function makeStyles() {
  return StyleSheet.create({
    page: { flex: 1 },
    safeArea: { flex: 1 },
    content: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 150,
      gap: Spacing.three,
    },
    title: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
    error: { color: '#D64B52' },
    syncWarning: { gap: Spacing.one },
    linkAccent: { color: '#C6FF3D' },
    card: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three, backgroundColor: '#14161A', borderWidth: 1, borderColor: '#262A31' },
    weekSummary: { flexDirection: 'row', gap: Spacing.four },
    weekMetric: { flex: 1 },
    metricValue: { fontSize: 28, lineHeight: 34 },
    chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.one },
    chartDay: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    barArea: { height: 95, width: '70%', maxWidth: 30, justifyContent: 'flex-end', backgroundColor: '#1C1F25', borderRadius: 8, overflow: 'hidden' },
    bar: { width: '100%', borderRadius: 8 },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
    monthControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
    calendar: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    calendarLogged: { backgroundColor: '#C6FF3D30' },
    dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262A31' },
    capitalize: { textTransform: 'capitalize' },
    foodDetails: { flex: 1, gap: 3 },
  });
}
