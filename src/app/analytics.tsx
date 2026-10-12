import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, globalStyles } from '@/styles/global';
import { DEFAULT_TARGETS, getMeals, getTargets, MacroTargets } from '@/storage/meals';
import { getCategoryBreakdown, getGoalProgress } from '@/utils/insights';
import { getTotals } from '@/utils/macros';

export default function AnalyticsScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);

  const loadData = async () => {
    const [fetchedMeals, fetchedTargets] = await Promise.all([getMeals(), getTargets()]);
    setMeals(fetchedMeals);
    setTargets(fetchedTargets || DEFAULT_TARGETS);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const totals = getTotals(meals);
  const progress = getGoalProgress(totals, targets);
  const categories = getCategoryBreakdown(meals);

  return (
    <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
      <Text style={globalStyles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Where your energy is coming from</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macro mix</Text>
        <ProgressRow label='Calories' percent={progress.calories} color={colors.primary} />
        <ProgressRow label='Protein' percent={progress.protein} color={colors.protein} />
        <ProgressRow label='Carbs' percent={progress.carbs} color={colors.carbs} />
        <ProgressRow label='Fat' percent={progress.fat} color={colors.fat} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category totals</Text>
        {categories.length === 0 ? (
          <Text style={styles.empty}>Log meals to see category totals.</Text>
        ) : (
          categories.map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{item.category}</Text>
                <Text style={styles.categoryCalories}>{item.calories} kcal</Text>
              </View>
              <Text style={styles.categoryMeta}>{item.meals} meals logged</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ProgressRow({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressText}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  progressRow: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#1A1D23',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  categoryRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    color: colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoryCalories: {
    color: colors.primary,
    fontWeight: '800',
  },
  categoryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
