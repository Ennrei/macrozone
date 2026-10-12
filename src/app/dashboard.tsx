import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, globalStyles } from '@/styles/global';
import { getMeals, getTargets, MacroTargets, DEFAULT_TARGETS } from '@/storage/meals';
import { getSevenDayTrend, getGoalProgress } from '@/utils/insights';
import { getTotals } from '@/utils/macros';

export default function DashboardScreen() {
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
  const trend = getSevenDayTrend(meals);
  const progress = getGoalProgress(totals, targets);
  const maxCalories = Math.max(...trend.days.map((day) => day.calories), 1);

  return (
    <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
      <Text style={globalStyles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Your weekly nutrition pulse</Text>

      <View style={styles.metricsRow}>
        <MetricCard label='Calories' value={`${totals.calories} kcal`} tint={colors.calories} />
        <MetricCard label='Protein' value={`${totals.protein}g`} tint={colors.protein} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label='Carbs' value={`${totals.carbs}g`} tint={colors.carbs} />
        <MetricCard label='Fat' value={`${totals.fat}g`} tint={colors.fat} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly trend</Text>
        <View style={styles.barChart}>
          {trend.days.map((day) => (
            <View key={day.date} style={styles.barColumn}>
              <Text style={styles.barLabel}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(8, (day.calories / maxCalories) * 100)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{day.calories}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal completion</Text>
        <ProgressRow label='Calories' percent={progress.calories} color={colors.primary} />
        <ProgressRow label='Protein' percent={progress.protein} color={colors.protein} />
        <ProgressRow label='Carbs' percent={progress.carbs} color={colors.carbs} />
        <ProgressRow label='Fat' percent={progress.fat} color={colors.fat} />
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: tint }]}>
      <Text style={[styles.metricLabel, { color: tint }]}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 8,
  },
  barTrack: {
    width: '100%',
    maxWidth: 26,
    height: 92,
    backgroundColor: '#1B1D22',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  barValue: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 8,
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
});
