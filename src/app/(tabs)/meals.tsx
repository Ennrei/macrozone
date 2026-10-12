import EmptyState from '@/components/EmptyState';
import MealItem from '@/components/MealItem';
import { clearAllMeals, getMeals, Meal } from '@/storage/meals';
import { colors, globalStyles, TAB_BAR_SPACE } from '@/styles/global';
import { confirmAction } from '@/utils/dialog';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MealsScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);

  const loadMeals = async () => {
    const data = await getMeals();
    setMeals(data);
  };

  const handleClearAll = () => {
    confirmAction('Clear All', 'Delete all meals?', async () => {
      await clearAllMeals();
      loadMeals();
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, []),
  );

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <FlatList
      style={globalStyles.container}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      showsVerticalScrollIndicator={false}
      data={meals}
      keyExtractor={(meal) => meal.id}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={globalStyles.title}>All Meals</Text>
          <Text style={styles.summary}>
            {meals.length} {meals.length === 1 ? 'meal' : 'meals'} ·{' '}
            {totalCalories.toLocaleString()} kcal logged
          </Text>
        </View>
      }
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item: meal }) => (
        <MealItem
          id={meal.id}
          name={meal.name}
          calories={meal.calories}
          protein={meal.protein}
          carbs={meal.carbs}
          fat={meal.fat}
          createdAt={meal.createdAt}
          onDelete={loadMeals}
        />
      )}
      ListFooterComponent={
        meals.length > 0 ? (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Ionicons name='trash-outline' size={16} color={colors.alert} />
            <Text style={styles.clearText}>Clear all meals</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 20,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.alert,
  },
  clearText: {
    color: colors.alert,
    fontSize: 15,
    fontWeight: '700',
  },
});