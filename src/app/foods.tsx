import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, globalStyles } from '@/styles/global';
import { getMeals } from '@/storage/meals';
import { getFoodFrequency } from '@/utils/insights';

export default function FoodsScreen() {
  const [meals, setMeals] = useState<any[]>([]);

  const loadData = async () => {
    setMeals(await getMeals());
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const foods = getFoodFrequency(meals);

  return (
    <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
      <Text style={globalStyles.title}>Foods</Text>
      <Text style={styles.subtitle}>Your most repeated meals</Text>

      <View style={styles.card}>
        {foods.length === 0 ? (
          <Text style={styles.empty}>Add meals to see your repeated foods.</Text>
        ) : (
          foods.slice(0, 8).map((item) => (
            <View key={item.name} style={styles.foodRow}>
              <View>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodMeta}>{item.entries} entries · avg {item.avgCalories} kcal</Text>
              </View>
              <Text style={styles.foodCalories}>{item.calories} kcal</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  foodName: {
    color: colors.text,
    fontWeight: '700',
  },
  foodMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  foodCalories: {
    color: colors.primary,
    fontWeight: '800',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
