import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EditTargetsModal from '@/components/EditTargetsModal';
import { colors, globalStyles } from '@/styles/global';
import { DEFAULT_TARGETS, getTargets, MacroTargets } from '@/storage/meals';

export default function TargetsScreen() {
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setTargets((await getTargets()) || DEFAULT_TARGETS);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  return (
    <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
      <Text style={globalStyles.title}>Targets</Text>
      <Text style={styles.subtitle}>Daily nutrition goals</Text>

      <View style={styles.card}>
        <GoalRow label='Calories' value={targets.calories} unit='kcal' color={colors.primary} />
        <GoalRow label='Protein' value={targets.protein} unit='g' color={colors.protein} />
        <GoalRow label='Carbs' value={targets.carbs} unit='g' color={colors.carbs} />
        <GoalRow label='Fat' value={targets.fat} unit='g' color={colors.fat} />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => setIsModalOpen(true)}>
        <Text style={styles.buttonText}>Edit targets</Text>
      </TouchableOpacity>

      <EditTargetsModal
        visible={isModalOpen}
        currentTargets={targets}
        onClose={() => setIsModalOpen(false)}
        onSave={(updated) => {
          setTargets(updated);
          setIsModalOpen(false);
        }}
      />
    </ScrollView>
  );
}

function GoalRow({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.goalRow}>
      <Text style={styles.goalLabel}>{label}</Text>
      <Text style={[styles.goalValue, { color }]}>{value}{unit}</Text>
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
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goalLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  goalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  button: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0A0B0D',
    fontWeight: '900',
  },
});
