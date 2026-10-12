import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getMeals, getTargets, DEFAULT_TARGETS, MacroTargets } from '../../storage/meals';
import { getTotals } from '../../utils/macros';
import { checkCalorieThresholds } from '../../utils/notifications';
import { getSevenDayTrend, getGoalProgress } from '../../utils/insights';
import CalorieBanner from '@/components/CalorieBanner';
import HomeHeader from '../../components/HomeHeader';
import MacroGrid from '../../components/MacroGrid';
import RecentMeals from '../../components/RecentMeals';
import ReminderToggle from '../../components/ReminderToggle';
import CopyButton from '../../components/CopyButton';
import EditTargetsModal from '../../components/EditTargetsModal';

export default function HomeScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totals = getTotals(meals || []);
  const trend = getSevenDayTrend(meals || []);
  const goalProgress = getGoalProgress(totals, targets);

  const loadData = async () => {
    try {
      const [fetchedMeals, fetchedTargets] = await Promise.all([
        getMeals(),
        getTargets(),
      ]);
      setMeals(Array.isArray(fetchedMeals) ? fetchedMeals : []);
      setTargets(fetchedTargets || DEFAULT_TARGETS);
    } catch (err) {
      console.error('Error loading home data:', err);
    }
  };


  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Trigger limit alerts when total calories or target goals change
  React.useEffect(() => {
    if (totals?.calories > 0 && targets?.calories) {
      checkCalorieThresholds(totals.calories, targets.calories);
    }
  }, [totals?.calories, targets?.calories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a3e635" />
      }
    >
      <HomeHeader />
      <CalorieBanner meals={meals} />

      <View style={styles.quickNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/dashboard')}>
          <Text style={styles.navButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/analytics')}>
          <Text style={styles.navButtonText}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/foods')}>
          <Text style={styles.navButtonText}>Foods</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/targets')}>
          <Text style={styles.navButtonText}>Targets</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.insightRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>7-day avg</Text>
          <Text style={styles.metricValue}>{Math.round(trend.averageCalories)} kcal</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Goal progress</Text>
          <Text style={styles.metricValue}>{goalProgress.calories}%</Text>
        </View>
      </View>

      {/* Target Customization Header Bar */}
      <View style={styles.targetBar}>
        <Text style={styles.targetTitle}>Daily Macro Goals</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setIsModalOpen(true)}
        >
          <Text style={styles.editBtnText}>⚙️ Edit Goals</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Macro Grid */}
      <MacroGrid totals={totals} targets={targets} />

      <CopyButton totals={totals} />
      <ReminderToggle />
      <RecentMeals meals={meals || []} onDelete={loadData} />

      {/* Edit Targets Modal */}
      <EditTargetsModal
        visible={isModalOpen}
        currentTargets={targets}
        onClose={() => setIsModalOpen(false)}
        onSave={(updated) => setTargets(updated)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16 },
  quickNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#14161A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262A31',
    paddingVertical: 10,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#C6FF3D',
    fontSize: 13,
    fontWeight: '700',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#14161A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262A31',
    padding: 12,
  },
  metricLabel: {
    color: '#8A919C',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    color: '#F4F6F8',
    fontSize: 18,
    fontWeight: '800',
  },
  targetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitle: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
  editBtn: {
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  editBtnText: { color: '#a3e635', fontSize: 12, fontWeight: 'bold' },
});