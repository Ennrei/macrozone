// src/components/MacroGrid.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MacroCard from './MacroCard';

interface MacroGridProps {
  totals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  targets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

// Default target fallback values
const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

export default function MacroGrid({ totals, targets }: MacroGridProps) {
  // Use passed targets or fallback to defaults safely
  const goals = targets || DEFAULT_GOALS;
  const safeTotals = totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <View style={styles.grid}>
      <MacroCard
        label="Calories"
        value={safeTotals.calories ?? 0}
        goal={goals?.calories ?? 2000}
        unit="kcal"
        color="#a3e635"
      />
      <MacroCard
        label="Protein"
        value={safeTotals.protein ?? 0}
        goal={goals?.protein ?? 150}
        unit="g"
        color="#38bdf8"
      />
      <MacroCard
        label="Carbs"
        value={safeTotals.carbs ?? 0}
        goal={goals?.carbs ?? 250}
        unit="g"
        color="#facc15"
      />
      <MacroCard
        label="Fat"
        value={safeTotals.fat ?? 0}
        goal={goals?.fat ?? 65}
        unit="g"
        color="#f43f5e"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
    marginBottom: 20,
  },
});