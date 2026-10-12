
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEALS_STORAGE_KEY = '@meals_data';
const TARGETS_STORAGE_KEY = '@macro_targets';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
  createdAt?: string; // same value as timestamp, kept for the newer screens
  category?: string;
  favorite?: boolean;
  notes?: string;
}

// What you pass to addMeal: id and timestamp are optional (made for you).
export type NewMeal = Omit<Meal, 'id' | 'timestamp' | 'createdAt'> &
  Partial<Pick<Meal, 'id' | 'timestamp'>>;

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DEFAULT_TARGETS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// 1. Fetch stored meals (repairs old meals that have no id or date)
export async function getMeals(): Promise<Meal[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(MEALS_STORAGE_KEY);
    const raw: any[] = jsonValue != null ? JSON.parse(jsonValue) : [];

    let repaired = false;
    const meals: Meal[] = raw.map((m) => {
      const fixed = { ...m };
      if (!fixed.id) {
        fixed.id = makeId();
        repaired = true;
      }
      if (!fixed.timestamp) {
        fixed.timestamp = fixed.createdAt ?? new Date().toISOString();
        repaired = true;
      }
      fixed.createdAt = fixed.createdAt ?? fixed.timestamp;
      return fixed as Meal;
    });

    if (repaired) {
      await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(meals));
    }
    return meals;
  } catch (e) {
    console.warn('Error reading meals from storage:', e);
    return [];
  }
}

// 2. Save new meal (newest first)
export async function addMeal(newMeal: NewMeal): Promise<void> {
  try {
    const existingMeals = await getMeals();
    const now = new Date().toISOString();
    const meal: Meal = {
      ...newMeal,
      id: newMeal.id ?? makeId(),
      timestamp: newMeal.timestamp ?? now,
      createdAt: newMeal.timestamp ?? now,
      category: newMeal.category ?? 'uncategorized',
      favorite: newMeal.favorite ?? false,
      notes: newMeal.notes ?? '',
    };
    await AsyncStorage.setItem(
      MEALS_STORAGE_KEY,
      JSON.stringify([meal, ...existingMeals]),
    );
  } catch (e) {
    console.warn('Error saving meal to storage:', e);
  }
}

// 3. Delete one meal
export async function deleteMeal(id: string): Promise<void> {
  try {
    const meals = await getMeals();
    const filtered = meals.filter((meal) => meal.id !== id);
    await AsyncStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Error deleting meal:', e);
  }
}

// 4. Delete every meal
export async function clearAllMeals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEALS_STORAGE_KEY);
  } catch (e) {
    console.warn('Error clearing meals:', e);
  }
}

// 5. Fetch custom target goals
export async function getTargets(): Promise<MacroTargets> {
  try {
    const jsonValue = await AsyncStorage.getItem(TARGETS_STORAGE_KEY);
    return jsonValue != null
      ? { ...DEFAULT_TARGETS, ...JSON.parse(jsonValue) }
      : DEFAULT_TARGETS;
  } catch (e) {
    console.warn('Error reading targets from storage:', e);
    return DEFAULT_TARGETS;
  }
}

// 6. Save updated custom target goals
export async function saveTargets(newTargets: MacroTargets): Promise<void> {
  try {
    await AsyncStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(newTargets));
  } catch (e) {
    console.warn('Error saving targets to storage:', e);
  }
}