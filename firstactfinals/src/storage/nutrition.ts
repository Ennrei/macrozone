import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@firstactfinals/nutrition-v1';
const OUTBOX_KEY = '@firstactfinals/nutrition-outbox-v1';
const DEFAULT_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_API_HOST}:4000/api`
).replace(/\/+$/, '');
const OBJECT_ID = /^[a-f\d]{24}$/i;

export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number];
export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionGoal = MacroTotals & {
  id: string;
  syncId?: string;
  name: string;
  active: boolean;
};

export type NutritionMeal = MacroTotals & {
  id: string;
  syncId?: string;
  name: string;
  category: MealCategory;
  loggedAt: string;
  notes: string;
  favorite: boolean;
  goalId: string;
};

export type NutritionData = {
  meals: NutritionMeal[];
  goals: NutritionGoal[];
  syncError?: string;
};

type ApiGoal = Omit<NutritionGoal, 'id' | 'syncId'> & {
  _id: string;
  clientId?: string;
};

type ApiMeal = Omit<NutritionMeal, 'id' | 'syncId' | 'goalId'> & {
  _id: string;
  clientId?: string;
  target?: string | { _id: string } | null;
};

type PendingOperation =
  | { kind: 'meal-upsert'; meal: NutritionMeal }
  | { kind: 'meal-delete'; id: string }
  | { kind: 'goal-upsert'; goal: NutritionGoal }
  | { kind: 'goal-delete'; id: string };

export const DEFAULT_GOAL: NutritionGoal = {
  id: 'everyday-balance',
  name: 'Everyday balance',
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  active: true,
};

const emptyData = (): NutritionData => ({
  meals: [],
  goals: [{ ...DEFAULT_GOAL }],
});

let operationQueue = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown API error';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error(`MacroZone API request timed out at ${API_BASE_URL}.`);
    }
    throw new Error(`Could not reach MacroZone API at ${API_BASE_URL}.`);
  } finally {
    clearTimeout(timeout);
  }
  const body = await response.json().catch(() => null) as
    | { data?: T; message?: string }
    | null;
  if (!response.ok) {
    throw new Error(body?.message || `MacroZone API returned ${response.status}.`);
  }
  if (!body || !('data' in body)) {
    throw new Error('MacroZone API returned an invalid response.');
  }
  return body.data as T;
}

async function readCache(): Promise<NutritionData> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return emptyData();
  const parsed: Partial<NutritionData> = JSON.parse(stored);
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const meals = Array.isArray(parsed.meals) ? parsed.meals : [];
  return {
    goals: goals.length > 0 ? goals : [{ ...DEFAULT_GOAL }],
    meals,
  };
}

async function writeCache(data: NutritionData): Promise<void> {
  const { syncError: _syncError, ...persisted } = data;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

async function readOutbox(): Promise<PendingOperation[]> {
  const stored = await AsyncStorage.getItem(OUTBOX_KEY);
  return stored ? JSON.parse(stored) as PendingOperation[] : [];
}

async function writeOutbox(operations: PendingOperation[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(operations));
}

function objectId(value: string): boolean {
  return OBJECT_ID.test(value);
}

function normalizeGoal(goal: ApiGoal): NutritionGoal {
  return {
    id: String(goal._id),
    ...(goal.clientId ? { syncId: goal.clientId } : {}),
    name: goal.name,
    calories: goal.calories,
    protein: goal.protein,
    carbs: goal.carbs,
    fat: goal.fat,
    active: goal.active,
  };
}

function normalizeMeal(meal: ApiMeal): NutritionMeal {
  const targetId = typeof meal.target === 'string'
    ? meal.target
    : meal.target?._id;
  return {
    id: String(meal._id),
    ...(meal.clientId ? { syncId: meal.clientId } : {}),
    name: meal.name,
    category: meal.category,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    loggedAt: meal.loggedAt,
    notes: meal.notes ?? '',
    favorite: meal.favorite ?? false,
    goalId: targetId ?? '',
  };
}

function upsertOperation(
  operations: PendingOperation[],
  operation: PendingOperation,
): PendingOperation[] {
  const identity = operationIdentity(operation);
  const index = operations.findIndex((item) => operationIdentity(item) === identity);
  const previous = index < 0 ? undefined : operations[index];
  const previousIsUpsert = previous?.kind === 'meal-upsert' || previous?.kind === 'goal-upsert';
  if (
    (operation.kind === 'meal-delete' || operation.kind === 'goal-delete')
    && previousIsUpsert
    && !objectId(identity)
  ) {
    return operations.filter((_, itemIndex) => itemIndex !== index);
  }
  if (index >= 0) {
    const next = [...operations];
    next[index] = operation;
    return next;
  }
  return [...operations, operation];
}

function operationIdentity(operation: PendingOperation): string {
  switch (operation.kind) {
    case 'meal-upsert':
      return operation.meal.syncId ?? operation.meal.id;
    case 'goal-upsert':
      return operation.goal.syncId ?? operation.goal.id;
    case 'meal-delete':
    case 'goal-delete':
      return operation.id;
  }
}

function findGoal(data: NutritionData, reference: string): NutritionGoal | undefined {
  return data.goals.find((goal) => goal.id === reference || goal.syncId === reference);
}

async function flushOutbox(
  initialData: NutritionData,
  initialOperations: PendingOperation[],
): Promise<{ data: NutritionData; operations: PendingOperation[] }> {
  let data = initialData;
  let operations = initialOperations;
  while (operations.length) {
    const operation = operations[0];
    if (operation.kind === 'goal-upsert') {
      const goal = operation.goal;
      const body = {
        name: goal.name,
        calories: goal.calories,
        protein: goal.protein,
        carbs: goal.carbs,
        fat: goal.fat,
      };
      const saved = objectId(goal.id)
        ? await request<ApiGoal>(`/targets/${encodeURIComponent(goal.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ ...body, active: goal.active }),
          })
        : await request<ApiGoal>('/targets', {
            method: 'POST',
            body: JSON.stringify({ ...body, clientId: goal.syncId ?? goal.id }),
          });
      const normalized = normalizeGoal(saved);
      const oldId = goal.id;
      const updatedGoal = {
        ...normalized,
        syncId: normalized.syncId ?? goal.syncId ?? goal.id,
        active: goal.active && !normalized.active ? goal.active : normalized.active,
      };
      data = {
        ...data,
        goals: data.goals.map((item) => item.id === oldId ? updatedGoal : item),
        meals: data.meals.map((meal) =>
          meal.goalId === oldId ? { ...meal, goalId: updatedGoal.id } : meal,
        ),
      };
      await writeCache(data);
      if (goal.active && !normalized.active) {
        await request<ApiGoal>(`/targets/${encodeURIComponent(updatedGoal.id)}/activate`, {
          method: 'POST',
        });
      }
    } else if (operation.kind === 'goal-delete') {
      await request(`/targets/${encodeURIComponent(operation.id)}`, { method: 'DELETE' });
      data = { ...data, goals: data.goals.filter((goal) => goal.id !== operation.id) };
      await writeCache(data);
    } else if (operation.kind === 'meal-upsert') {
      const meal = operation.meal;
      const goal = findGoal(data, meal.goalId);
      const body = {
        name: meal.name,
        category: meal.category,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        loggedAt: meal.loggedAt,
        notes: meal.notes,
        favorite: meal.favorite,
        target: goal?.id && objectId(goal.id) ? goal.id : null,
      };
      const saved = objectId(meal.id) && !meal.syncId
        ? await request<ApiMeal>(`/meals/${encodeURIComponent(meal.id)}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await request<ApiMeal>('/meals', {
            method: 'POST',
            body: JSON.stringify({ ...body, clientId: meal.syncId ?? meal.id }),
          });
      const normalized = normalizeMeal(saved);
      const updatedMeal = {
        ...normalized,
        syncId: normalized.syncId ?? meal.syncId ?? meal.id,
        goalId: goal?.id ?? normalized.goalId,
      };
      data = {
        ...data,
        meals: data.meals.map((item) => item.id === meal.id ? updatedMeal : item),
      };
      await writeCache(data);
    } else {
      await request(`/meals/${encodeURIComponent(operation.id)}`, { method: 'DELETE' });
      data = { ...data, meals: data.meals.filter((meal) => meal.id !== operation.id) };
      await writeCache(data);
    }
    operations = operations.slice(1);
    await writeOutbox(operations);
  }
  return { data, operations };
}

async function loadRemoteData(): Promise<{ meals: ApiMeal[]; goals: ApiGoal[] }> {
  const [meals, goals] = await Promise.all([
    request<ApiMeal[]>('/meals'),
    request<ApiGoal[]>('/targets'),
  ]);
  if (!Array.isArray(meals) || !Array.isArray(goals)) {
    throw new Error('MacroZone API returned invalid meal or goal lists.');
  }
  return { meals, goals };
}

function sameGoal(left: NutritionGoal, right: NutritionGoal): boolean {
  return left.name === right.name
    && left.calories === right.calories
    && left.protein === right.protein
    && left.carbs === right.carbs
    && left.fat === right.fat
    && left.active === right.active;
}

function sameMeal(left: NutritionMeal, right: NutritionMeal): boolean {
  return left.name === right.name
    && left.category === right.category
    && left.calories === right.calories
    && left.protein === right.protein
    && left.carbs === right.carbs
    && left.fat === right.fat
    && left.loggedAt === right.loggedAt
    && left.notes === right.notes
    && left.favorite === right.favorite
    && left.goalId === right.goalId;
}

export async function loadNutritionData(): Promise<NutritionData> {
  return serialize(async () => {
    let data = await readCache();
    let operations = await readOutbox();
    try {
      const remote = await loadRemoteData();
      const remoteGoals = remote.goals.map(normalizeGoal);
      const goalIds = new Map<string, string>();
      const migratedGoals = data.goals.map((goal) => {
        const serverGoal = remoteGoals.find((item) =>
          item.id === goal.id
          || (goal.syncId && item.syncId === goal.syncId)
          || item.name.toLocaleLowerCase() === goal.name.toLocaleLowerCase(),
        );
        if (!serverGoal) {
          operations = upsertOperation(operations, { kind: 'goal-upsert', goal });
          return goal;
        }
        goalIds.set(goal.id, serverGoal.id);
        return { ...serverGoal, syncId: serverGoal.syncId ?? goal.syncId ?? goal.id };
      });
      const goals = [
        ...migratedGoals,
        ...remoteGoals.filter((goal) => !migratedGoals.some((item) => item.id === goal.id)),
      ];
      const activeRemoteGoal = remoteGoals.find((goal) => goal.active);
      const normalizedGoals = activeRemoteGoal
        ? goals.map((goal) => ({ ...goal, active: goal.id === activeRemoteGoal.id }))
        : goals;

      const remoteMeals = remote.meals.map(normalizeMeal);
      const meals = [...remoteMeals];
      for (const cachedMeal of data.meals) {
        const serverMeal = remoteMeals.find((item) =>
          item.id === cachedMeal.id
          || (cachedMeal.syncId && item.syncId === cachedMeal.syncId),
        );
        if (serverMeal) {
          const index = meals.findIndex((item) => item.id === serverMeal.id);
          const remappedGoalId = goalIds.get(cachedMeal.goalId) ?? cachedMeal.goalId;
          meals[index] = { ...serverMeal, goalId: serverMeal.goalId || remappedGoalId };
        } else {
          const localMeal = {
            ...cachedMeal,
            goalId: goalIds.get(cachedMeal.goalId) ?? cachedMeal.goalId,
          };
          if (!operations.some((item) =>
            item.kind === 'meal-upsert'
            && (item.meal.syncId ?? item.meal.id) === (localMeal.syncId ?? localMeal.id),
          )) {
            operations = upsertOperation(operations, { kind: 'meal-upsert', meal: localMeal });
          }
          meals.push(localMeal);
        }
      }
      data = { meals, goals: normalizedGoals };
      await writeCache(data);
      await writeOutbox(operations);
      const result = await flushOutbox(data, operations);
      data = result.data;
      return data;
    } catch (error) {
      console.warn('Could not synchronize MacroZone data:', error);
      return {
        ...data,
        syncError: `Saved data is available locally, but the backend is not synced: ${apiErrorMessage(error)}`,
      };
    }
  });
}

export async function saveNutritionData(nextData: NutritionData): Promise<NutritionData> {
  return serialize(async () => {
    const previous = await readCache();
    let operations = await readOutbox();
    const data: NutritionData = { meals: nextData.meals, goals: nextData.goals };

    for (const goal of previous.goals) {
      if (!data.goals.some((item) => item.id === goal.id)) {
        if (objectId(goal.id)) {
          operations = upsertOperation(operations, { kind: 'goal-delete', id: goal.id });
        } else {
          operations = operations.filter((item) =>
            !(item.kind === 'goal-upsert' && (item.goal.syncId ?? item.goal.id) === (goal.syncId ?? goal.id)),
          );
        }
      }
    }
    for (const goal of data.goals) {
      const oldGoal = previous.goals.find((item) => item.id === goal.id);
      if (!oldGoal || !sameGoal(oldGoal, goal)) {
        operations = upsertOperation(operations, { kind: 'goal-upsert', goal });
      }
    }
    for (const meal of previous.meals) {
      if (!data.meals.some((item) => item.id === meal.id)) {
        if (objectId(meal.id)) {
          operations = upsertOperation(operations, { kind: 'meal-delete', id: meal.id });
        } else {
          operations = operations.filter((item) =>
            !(item.kind === 'meal-upsert' && (item.meal.syncId ?? item.meal.id) === (meal.syncId ?? meal.id)),
          );
        }
      }
    }
    for (const meal of data.meals) {
      const oldMeal = previous.meals.find((item) => item.id === meal.id);
      if (!oldMeal || !sameMeal(oldMeal, meal)) {
        operations = upsertOperation(operations, { kind: 'meal-upsert', meal });
      }
    }

    await writeCache(data);
    await writeOutbox(operations);
    try {
      const result = await flushOutbox(data, operations);
      return result.data;
    } catch (error) {
      console.warn('Could not synchronize MacroZone changes:', error);
      return {
        ...data,
        syncError: `Saved on this device; backend sync is pending: ${apiErrorMessage(error)}`,
      };
    }
  });
}

export function createMeal(
  input: Omit<NutritionMeal, 'id' | 'syncId' | 'loggedAt' | 'favorite' | 'goalId'>,
  goalId: string,
): NutritionMeal {
  return {
    ...input,
    id: makeId(),
    loggedAt: new Date().toISOString(),
    favorite: false,
    goalId,
  };
}

export function createGoal(
  input: Omit<NutritionGoal, 'id' | 'syncId' | 'active'>,
): NutritionGoal {
  return { ...input, id: makeId(), active: false };
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function sumMacros(meals: NutritionMeal[]): MacroTotals {
  return meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
