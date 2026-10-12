import { MacroTargets, Meal } from '@/storage/meals';

export function getSevenDayTrend(meals: Meal[]) {
  const days: { date: string; calories: number; meals: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - i);

    const mealsForDay = meals.filter((meal) => {
      const source = new Date(meal.createdAt ?? meal.timestamp ?? Date.now());
      return (
        source.getFullYear() === date.getFullYear() &&
        source.getMonth() === date.getMonth() &&
        source.getDate() === date.getDate()
      );
    });

    const calories = mealsForDay.reduce((sum, meal) => sum + meal.calories, 0);
    days.push({
      date: date.toISOString().slice(0, 10),
      calories,
      meals: mealsForDay.length,
    });
  }

  const averageCalories =
    days.reduce((sum, day) => sum + day.calories, 0) / (days.length || 1);

  return { days, averageCalories };
}

export function getGoalProgress(totals: { calories: number; protein: number; carbs: number; fat: number }, targets: MacroTargets) {
  return {
    calories: targets.calories ? Math.min(100, Math.round((totals.calories / targets.calories) * 100)) : 0,
    protein: targets.protein ? Math.min(100, Math.round((totals.protein / targets.protein) * 100)) : 0,
    carbs: targets.carbs ? Math.min(100, Math.round((totals.carbs / targets.carbs) * 100)) : 0,
    fat: targets.fat ? Math.min(100, Math.round((totals.fat / targets.fat) * 100)) : 0,
  };
}

export function getFoodFrequency(meals: Meal[]) {
  const groups = new Map<string, { name: string; entries: number; calories: number; protein: number; carbs: number; fat: number }>();

  meals.forEach((meal) => {
    const key = (meal.name ?? '').trim() || 'Unnamed meal';
    const current = groups.get(key) ?? {
      name: key,
      entries: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    current.entries += 1;
    current.calories += meal.calories;
    current.protein += meal.protein;
    current.carbs += meal.carbs;
    current.fat += meal.fat;
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      avgCalories: Math.round(entry.calories / entry.entries),
    }))
    .sort((a, b) => b.entries - a.entries || b.calories - a.calories);
}

export function getCategoryBreakdown(meals: Meal[]) {
  const groups = new Map<string, { category: string; calories: number; meals: number }>();

  meals.forEach((meal) => {
    const category = (meal.category ?? 'uncategorized').toLowerCase();
    const current = groups.get(category) ?? { category, calories: 0, meals: 0 };
    current.calories += meal.calories;
    current.meals += 1;
    groups.set(category, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.calories - a.calories);
}
