import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createGoal,
  createMeal,
  DEFAULT_GOAL,
  loadNutritionData,
  localDateKey,
  MEAL_CATEGORIES,
  NutritionData,
  NutritionGoal,
  NutritionMeal,
  saveNutritionData,
  sumMacros,
} from '@/storage/nutrition';

type MealDraft = {
  name: string;
  category: (typeof MEAL_CATEGORIES)[number];
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
};

type GoalDraft = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

const emptyMealDraft = (): MealDraft => ({
  name: '',
  category: 'breakfast',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
});

const defaultGoalDraft = (goal: NutritionGoal): GoalDraft => ({
  name: goal.name,
  calories: String(goal.calories),
  protein: String(goal.protein),
  carbs: String(goal.carbs),
  fat: String(goal.fat),
});

function parseBoundedNumber(value: string, min: number, max: number): number | null {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [data, setData] = useState<NutritionData>({ meals: [], goals: [{ ...DEFAULT_GOAL }] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<NutritionMeal | null>(null);
  const [editingGoal, setEditingGoal] = useState<NutritionGoal | null>(null);
  const [mealFormError, setMealFormError] = useState('');
  const [goalFormError, setGoalFormError] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft>(emptyMealDraft());
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(defaultGoalDraft(DEFAULT_GOAL));
  const [search, setSearch] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadNutritionData()
      .then((stored) => {
        if (mounted) {
          setData(stored);
          setError(stored.syncError ?? '');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Could not load nutrition journal:', loadError);
        if (mounted) setError('Your journal could not be loaded. Please restart the app and try again.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const today = localDateKey(new Date());
  const recentStart = new Date();
  recentStart.setHours(0, 0, 0, 0);
  recentStart.setDate(recentStart.getDate() - 6);
  const recentStartKey = localDateKey(recentStart);
  const todaysMeals = useMemo(
    () => data.meals.filter((meal) => localDateKey(meal.loggedAt) === today),
    [data.meals, today],
  );
  const totals = sumMacros(todaysMeals);
  const activeGoal = data.goals.find((goal) => goal.active) ?? data.goals[0] ?? DEFAULT_GOAL;
  const lastSevenDaysMeals = useMemo(
    () => data.meals.filter((meal) => localDateKey(meal.loggedAt) >= recentStartKey),
    [data.meals, recentStartKey],
  );
  const sevenDayAverage = Math.round(sumMacros(lastSevenDaysMeals).calories / 7);
  const calorieGoalProgress = activeGoal.calories > 0
    ? Math.round((totals.calories / activeGoal.calories) * 100)
    : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const visibleMeals = useMemo(
    () =>
      [...data.meals]
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
        .filter((meal) => !showFavorites || meal.favorite)
        .filter((meal) => {
          const query = search.trim().toLocaleLowerCase();
          return (
            !query ||
            meal.name.toLocaleLowerCase().includes(query) ||
            meal.category.includes(query) ||
            meal.notes.toLocaleLowerCase().includes(query)
          );
        }),
    [data.meals, search, showFavorites],
  );

  const commitData = async (next: NutritionData) => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveNutritionData(next);
      setData(saved);
      setError(saved.syncError ?? '');
      return true;
    } catch (saveError) {
      console.error('Could not save nutrition journal:', saveError);
      setError('Changes could not be saved. Check device storage and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const retrySync = async () => {
    setSaving(true);
    try {
      const synced = await loadNutritionData();
      setData(synced);
      setError(synced.syncError ?? '');
    } catch (syncError) {
      console.error('Could not retry MacroZone synchronization:', syncError);
      setError('Could not retry backend synchronization.');
    } finally {
      setSaving(false);
    }
  };

  const openNewMeal = () => {
    setEditingMeal(null);
    setMealDraft(emptyMealDraft());
    setMealFormError('');
    setMealModalVisible(true);
  };

  const openEditMeal = (meal: NutritionMeal) => {
    setEditingMeal(meal);
    setMealDraft({
      name: meal.name,
      category: meal.category,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      notes: meal.notes,
    });
    setMealFormError('');
    setMealModalVisible(true);
  };

  const saveMeal = async () => {
    if (mealDraft.name.trim().length < 2 || mealDraft.name.trim().length > 80) {
      setMealFormError('Meal names must be between 2 and 80 characters.');
      return;
    }
    if (mealDraft.notes.trim().length > 500) {
      setMealFormError('Meal notes must be 500 characters or fewer.');
      return;
    }
    const calories = parseBoundedNumber(mealDraft.calories, 0, 10000);
    const protein = parseBoundedNumber(mealDraft.protein || '0', 0, 600);
    const carbs = parseBoundedNumber(mealDraft.carbs || '0', 0, 1200);
    const fat = parseBoundedNumber(mealDraft.fat || '0', 0, 400);
    if (calories === null || protein === null || carbs === null || fat === null) {
      setMealFormError('Calories must be 0–10,000, protein 0–600g, carbs 0–1,200g, and fat 0–400g.');
      return;
    }

    const values = {
      name: mealDraft.name.trim(),
      category: mealDraft.category,
      calories,
      protein,
      carbs,
      fat,
      notes: mealDraft.notes.trim(),
    };
    const meals = editingMeal
      ? data.meals.map((meal) =>
          meal.id === editingMeal.id ? { ...meal, ...values } : meal,
        )
      : [createMeal(values, activeGoal.id), ...data.meals];

    const saved = await commitData({ ...data, meals });
    if (!saved) return;
    setMealModalVisible(false);
    setMealFormError('');
  };

  const confirmDeleteMeal = (meal: NutritionMeal) => {
    setConfirmation({
      title: 'Delete meal',
      message: `Delete “${meal.name}” from your journal?`,
      confirmLabel: 'Delete',
      onConfirm: () =>
        void commitData({ ...data, meals: data.meals.filter((item) => item.id !== meal.id) }),
    });
  };

  const toggleFavorite = (meal: NutritionMeal) => {
    void commitData({
      ...data,
      meals: data.meals.map((item) =>
        item.id === meal.id ? { ...item, favorite: !item.favorite } : item,
      ),
    });
  };

  const duplicateMeal = (meal: NutritionMeal) => {
    const copy = createMeal(
      {
        name: meal.name,
        category: meal.category,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        notes: meal.notes,
      },
      activeGoal.id,
    );
    void commitData({ ...data, meals: [copy, ...data.meals] });
  };

  const openGoalEditor = (goal?: NutritionGoal) => {
    const selected = goal ?? activeGoal;
    setEditingGoal(goal ?? null);
    setGoalDraft({ ...defaultGoalDraft(selected), name: goal ? goal.name : '' });
    setGoalFormError('');
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!goalDraft.name.trim() || goalDraft.name.trim().length > 48) {
      setGoalFormError('Enter a goal name of 1–48 characters.');
      return;
    }
    if (data.goals.some((goal) =>
      goal.id !== editingGoal?.id
      && goal.name.toLocaleLowerCase() === goalDraft.name.trim().toLocaleLowerCase(),
    )) {
      setGoalFormError('A daily goal with that name already exists.');
      return;
    }
    const calories = parseBoundedNumber(goalDraft.calories, 500, 10000);
    const protein = parseBoundedNumber(goalDraft.protein, 0, 600);
    const carbs = parseBoundedNumber(goalDraft.carbs, 0, 1200);
    const fat = parseBoundedNumber(goalDraft.fat, 0, 400);
    if (calories === null || protein === null || carbs === null || fat === null) {
      setGoalFormError('Calories must be 500–10,000, protein 0–600g, carbs 0–1,200g, and fat 0–400g.');
      return;
    }

    const values = {
      name: goalDraft.name.trim(),
      calories,
      protein,
      carbs,
      fat,
    };
    const goals = editingGoal
      ? data.goals.map((goal) =>
          goal.id === editingGoal.id ? { ...goal, ...values } : goal,
        )
      : [...data.goals, createGoal(values)];
    const saved = await commitData({ ...data, goals });
    if (!saved) return;
    setGoalModalVisible(false);
    setGoalFormError('');
  };

  const activateGoal = (goal: NutritionGoal) => {
    void commitData({
      ...data,
      goals: data.goals.map((item) => ({ ...item, active: item.id === goal.id })),
    });
  };

  const deleteGoal = (goal: NutritionGoal) => {
    if (goal.active || data.goals.length === 1) {
      setConfirmation({
        title: 'Goal in use',
        message: 'Keep at least one daily goal and activate another before deleting this one.',
        confirmLabel: 'Got it',
        onConfirm: () => undefined,
      });
      return;
    }
    setConfirmation({
      title: 'Delete goal',
      message: `Delete “${goal.name}”?`,
      confirmLabel: 'Delete',
      onConfirm: () =>
        void commitData({ ...data, goals: data.goals.filter((item) => item.id !== goal.id) }),
    });
  };

  const styles = makeStyles(theme);

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.dateRow}>
              <View style={styles.dateDot} />
              <ThemedText type="smallBold" style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.greetingRow}>
              <ThemedText type="subtitle" style={styles.greeting}>{greeting}.</ThemedText>
              <ThemedText type="smallBold" style={styles.wordmark}>MacroZone</ThemedText>
            </View>
          </View>

          <View style={styles.insightRow}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metricLabel}>7-day avg</ThemedText>
              <ThemedText type="smallBold" style={styles.metricValue}>{sevenDayAverage.toLocaleString()} kcal</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metricLabel}>Goal progress</ThemedText>
              <ThemedText type="smallBold" style={styles.metricValue}>{calorieGoalProgress}%</ThemedText>
            </ThemedView>
          </View>

          {error ? (
            <View style={styles.syncWarning}>
              <ThemedText style={styles.error}>{error}</ThemedText>
              <Pressable onPress={() => void retrySync()} disabled={saving}>
                <ThemedText type="smallBold" style={styles.linkAccent}>Retry sync</ThemedText>
              </Pressable>
            </View>
          ) : null}
          {saving ? <ThemedText type="small" themeColor="textSecondary">Saving…</ThemedText> : null}
          {loading ? (
            <ActivityIndicator accessibilityLabel="Loading nutrition journal" />
          ) : (
            <>
              <View style={styles.targetHeading}>
                <ThemedText type="smallBold" themeColor="textSecondary">Daily Macro Goals</ThemedText>
                <Pressable onPress={() => openGoalEditor()}>
                  <ThemedText type="smallBold" style={styles.linkAccent}>Edit Goals</ThemedText>
                </Pressable>
              </View>
              <MacroSummary
                label="Calories"
                value={totals.calories}
                target={activeGoal.calories}
                color="#C6FF3D"
                unit="kcal"
              />
              <MacroSummary label="Protein" value={totals.protein} target={activeGoal.protein} color="#3DE0FF" />
              <MacroSummary label="Carbs" value={totals.carbs} target={activeGoal.carbs} color="#FFB020" />
              <MacroSummary label="Fat" value={totals.fat} target={activeGoal.fat} color="#FF4FA3" />

              <View style={styles.sectionHeading}>
                <View>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>Recent</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {data.meals.length} {data.meals.length === 1 ? 'meal' : 'meals'} logged
                  </ThemedText>
                </View>
                <Pressable style={styles.primaryButton} onPress={openNewMeal} accessibilityRole="button">
                  <ThemedText style={styles.primaryButtonText}>+ Add meal</ThemedText>
                </Pressable>
              </View>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search meals, categories, or notes"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Search meals"
                style={styles.search}
              />
              <View style={styles.filters}>
                <FilterButton selected={!showFavorites} label="All meals" onPress={() => setShowFavorites(false)} />
                <FilterButton selected={showFavorites} label="Favorites" onPress={() => setShowFavorites(true)} />
              </View>

              {visibleMeals.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyCard}>
                  <ThemedText type="smallBold">
                    {search || showFavorites ? 'No matching meals' : 'No meals logged yet'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {search || showFavorites
                      ? 'Try a different search or show all meals.'
                      : 'Log your first meal to see your nutrition totals here.'}
                  </ThemedText>
                  {!search && !showFavorites ? (
                    <Pressable onPress={openNewMeal} style={styles.secondaryButton}>
                      <ThemedText type="linkPrimary">Log your first meal</ThemedText>
                    </Pressable>
                  ) : null}
                </ThemedView>
              ) : (
                visibleMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    goal={data.goals.find((goal) => goal.id === meal.goalId) ?? activeGoal}
                    theme={theme}
                    onEdit={() => openEditMeal(meal)}
                    onDelete={() => confirmDeleteMeal(meal)}
                    onFavorite={() => toggleFavorite(meal)}
                    onDuplicate={() => duplicateMeal(meal)}
                  />
                ))
              )}
              {data.meals.length > 0 ? (
                <Pressable
                  style={styles.clearButton}
                  onPress={() =>
                    setConfirmation({
                      title: 'Clear meal journal',
                      message: 'Permanently delete every logged meal?',
                      confirmLabel: 'Clear meals',
                      onConfirm: () => void commitData({ ...data, meals: [] }),
                    })
                  }
                >
                  <ThemedText style={styles.deleteText}>Clear meal journal</ThemedText>
                </Pressable>
              ) : null}

              <ThemedView type="backgroundElement" style={styles.goalsCard}>
                <View style={styles.sectionHeading}>
                  <View>
                    <ThemedText type="smallBold">Daily goals</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Active: {activeGoal.name}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => openGoalEditor()}>
                    <ThemedText type="linkPrimary">Edit</ThemedText>
                  </Pressable>
                </View>
                {data.goals.map((goal) => (
                  <View key={goal.id} style={styles.goalRow}>
                    <Pressable style={styles.goalMain} onPress={() => activateGoal(goal)}>
                      <ThemedText type="smallBold">
                        {goal.active ? '● ' : '○ '}{goal.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {goal.calories} kcal · P {goal.protein}g · C {goal.carbs}g · F {goal.fat}g
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => openGoalEditor(goal)} accessibilityLabel={`Edit ${goal.name}`}>
                      <ThemedText type="linkPrimary">Edit</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => deleteGoal(goal)} accessibilityLabel={`Delete ${goal.name}`}>
                      <ThemedText style={styles.deleteText}>Delete</ThemedText>
                    </Pressable>
                  </View>
                ))}
                <Pressable style={styles.secondaryButton} onPress={() => openGoalEditor()}>
                  <ThemedText type="linkPrimary">+ Add another goal</ThemedText>
                </Pressable>
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <MealEditor
        visible={mealModalVisible}
        title={editingMeal ? 'Edit meal' : 'Log a meal'}
        draft={mealDraft}
        setDraft={setMealDraft}
        error={mealFormError}
        clearError={() => setMealFormError('')}
        onCancel={() => setMealModalVisible(false)}
        onSave={() => void saveMeal()}
      />
      <GoalEditor
        visible={goalModalVisible}
        title={editingGoal ? 'Edit daily goal' : 'Add daily goal'}
        draft={goalDraft}
        setDraft={setGoalDraft}
        error={goalFormError}
        clearError={() => setGoalFormError('')}
        onCancel={() => setGoalModalVisible(false)}
        onSave={() => void saveGoal()}
      />
      <ConfirmationDialog
        visible={confirmation !== null}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        theme={theme}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          const action = confirmation?.onConfirm;
          setConfirmation(null);
          action?.();
        }}
      />
    </ThemedView>
  );
}

function ProgressBar({ value, target, color }: { value: number; target: number; color: string }) {
  const progressColor = target > 0 && value > target ? '#FF4D5E' : color;
  return (
    <View style={stylesStatic.track}>
      <View style={[stylesStatic.fill, { width: `${target ? Math.min(100, (value / target) * 100) : 0}%`, backgroundColor: progressColor }]} />
    </View>
  );
}

function MacroSummary({
  label,
  value,
  target,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: 'g' | 'kcal';
}) {
  const over = target > 0 && value > target;
  const remaining = Math.max(target - value, 0);
  return (
    <ThemedView type="backgroundElement" style={stylesStatic.macroItem}>
      <ThemedText type="smallBold" style={{ color }}>{label.toUpperCase()}</ThemedText>
      <View style={stylesStatic.macroValueRow}>
        <ThemedText type="smallBold" style={stylesStatic.macroValue}>{Math.round(value).toLocaleString()}</ThemedText>
        <ThemedText type="smallBold" style={stylesStatic.macroUnit}>{unit}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {over
          ? `${Math.round(value - target).toLocaleString()}${unit} over`
          : unit === 'kcal'
            ? `${Math.round(remaining).toLocaleString()} kcal left of ${target.toLocaleString()}`
            : `of ${target.toLocaleString()}${unit}`}
      </ThemedText>
      <ProgressBar value={value} target={target} color={color} />
    </ThemedView>
  );
}

function FilterButton({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        stylesStatic.filter,
        {
          backgroundColor: selected ? '#C6FF3D' : 'transparent',
          borderColor: selected ? '#C6FF3D' : theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: selected ? '#0A0B0D' : theme.textSecondary }}>{label}</ThemedText>
    </Pressable>
  );
}

function MealCard({
  meal,
  goal,
  theme,
  onEdit,
  onDelete,
  onFavorite,
  onDuplicate,
}: {
  meal: NutritionMeal;
  goal: NutritionGoal;
  theme: ReturnType<typeof useTheme>;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onDuplicate: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={stylesStatic.mealCard}>
      <View style={stylesStatic.mealHeader}>
        <View style={stylesStatic.mealNameWrap}>
          <ThemedText type="smallBold" numberOfLines={1}>{meal.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {meal.category} · {localDateKey(meal.loggedAt) === localDateKey(new Date())
              ? `Today, ${new Date(meal.loggedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
              : new Date(meal.loggedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={stylesStatic.mealCalories}>{Math.round(meal.calories)} kcal</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Protein {meal.protein}g · Carbs {meal.carbs}g · Fat {meal.fat}g
      </ThemedText>
      {meal.notes ? <ThemedText type="small">{meal.notes}</ThemedText> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {goal.calories ? Math.round((meal.calories / goal.calories) * 100) : 0}% of {goal.name} calorie goal
      </ThemedText>
      <View style={stylesStatic.actions}>
        <Action label={meal.favorite ? '★ Saved' : '☆ Save'} onPress={onFavorite} color={meal.favorite ? '#C6FF3D' : theme.textSecondary} />
        <Action label="Edit" onPress={onEdit} color="#C6FF3D" />
        <Action label="Copy" onPress={onDuplicate} color="#C6FF3D" />
        <Action label="Delete" onPress={onDelete} color="#D64B52" />
      </View>
    </ThemedView>
  );
}

function Action({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={stylesStatic.action}>
      <ThemedText type="smallBold" style={{ color }}>{label}</ThemedText>
    </Pressable>
  );
}

function MealEditor({
  visible,
  title,
  draft,
  setDraft,
  error,
  clearError,
  onCancel,
  onSave,
}: {
  visible: boolean;
  title: string;
  draft: MealDraft;
  setDraft: (draft: MealDraft) => void;
  error: string;
  clearError: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const set = (key: keyof MealDraft, value: string) => {
    clearError();
    setDraft({ ...draft, [key]: value });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <ThemedView style={styles.modalPage}>
        <KeyboardAvoidingView style={styles.modalFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle" style={styles.modalTitle}>{title}</ThemedText>
            <FormField label="Meal name" value={draft.name} onChangeText={(value) => set('name', value)} placeholder="e.g. Oat bowl" />
            <ThemedText type="smallBold">Meal category</ThemedText>
            <View style={styles.categoryRow}>
              {MEAL_CATEGORIES.map((category) => (
                <FilterButton
                  key={category}
                  selected={draft.category === category}
                  label={category}
                  onPress={() => set('category', category)}
                />
              ))}
            </View>
            <View style={styles.formGrid}>
              <FormField label="Calories (kcal)" value={draft.calories} onChangeText={(value) => set('calories', value)} keyboardType="decimal-pad" />
              <FormField label="Protein (g)" value={draft.protein} onChangeText={(value) => set('protein', value)} keyboardType="decimal-pad" />
              <FormField label="Carbohydrates (g)" value={draft.carbs} onChangeText={(value) => set('carbs', value)} keyboardType="decimal-pad" />
              <FormField label="Fat (g)" value={draft.fat} onChangeText={(value) => set('fat', value)} keyboardType="decimal-pad" />
            </View>
            <FormField label="Notes (optional)" value={draft.notes} onChangeText={(value) => set('notes', value)} placeholder="Add a note" multiline />
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onSave}>
                <ThemedText style={styles.primaryButtonText}>Save meal</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );
}

function GoalEditor({
  visible,
  title,
  draft,
  setDraft,
  error,
  clearError,
  onCancel,
  onSave,
}: {
  visible: boolean;
  title: string;
  draft: GoalDraft;
  setDraft: (draft: GoalDraft) => void;
  error: string;
  clearError: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const set = (key: keyof GoalDraft, value: string) => {
    clearError();
    setDraft({ ...draft, [key]: value });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <ThemedView style={styles.modalPage}>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={styles.modalTitle}>{title}</ThemedText>
          <FormField label="Goal name" value={draft.name} onChangeText={(value) => set('name', value)} placeholder="Everyday balance" />
          <FormField label="Calories (kcal)" value={draft.calories} onChangeText={(value) => set('calories', value)} keyboardType="decimal-pad" />
          <FormField label="Protein (g)" value={draft.protein} onChangeText={(value) => set('protein', value)} keyboardType="decimal-pad" />
          <FormField label="Carbohydrates (g)" value={draft.carbs} onChangeText={(value) => set('carbs', value)} keyboardType="decimal-pad" />
          <FormField label="Fat (g)" value={draft.fat} onChangeText={(value) => set('fat', value)} keyboardType="decimal-pad" />
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSave}>
              <ThemedText style={styles.primaryButtonText}>Save goal</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel,
  theme,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  theme: ReturnType<typeof useTheme>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const styles = makeStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <ThemedView type="backgroundElement" style={styles.dialogCard}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{message}</ThemedText>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable style={styles.destructiveButton} onPress={onConfirm}>
              <ThemedText style={styles.destructiveText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1C1F25',
    marginTop: 14,
  },
  fill: { height: '100%', borderRadius: 5 },
  macroItem: { gap: 4, padding: 14, backgroundColor: '#14161A', borderRadius: 20, borderWidth: 1, borderColor: '#262A31' },
  macroValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 },
  macroValue: { color: '#F4F6F8', fontSize: 26, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 },
  macroUnit: { color: '#8A919C', fontSize: 13, marginBottom: 3 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  mealCard: { borderRadius: 18, padding: 16, gap: 9, marginTop: 10, borderWidth: 1, borderColor: '#262A31' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  mealNameWrap: { flex: 1, gap: 3 },
  mealCalories: { color: '#C6FF3D', fontSize: 18, fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262A31', paddingTop: 8 },
  action: { paddingVertical: 5, paddingHorizontal: 7 },
});

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    page: { flex: 1 },
    safeArea: { flex: 1 },
    content: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 150,
      gap: Spacing.three,
    },
    header: { marginTop: 8, marginBottom: 2, gap: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C6FF3D' },
    dateText: { color: '#8A919C', fontSize: 11, letterSpacing: 1.5 },
    greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    greeting: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.6 },
    wordmark: { color: '#C6FF3D', letterSpacing: 0.5 },
    insightRow: { flexDirection: 'row', gap: 12, marginBottom: 2 },
    metricCard: { flex: 1, borderRadius: 14, padding: 12, backgroundColor: '#14161A', borderWidth: 1, borderColor: '#262A31', gap: 4 },
    metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
    metricValue: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
    targetHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: -8 },
    linkAccent: { color: '#C6FF3D' },
    primaryButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#C6FF3D' },
    primaryButtonText: { color: '#0A0B0D', fontWeight: '900' },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
    sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
    search: { borderWidth: 1, borderColor: '#262A31', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, color: '#F4F6F8', backgroundColor: '#14161A' },
    filters: { flexDirection: 'row', gap: Spacing.two },
    emptyCard: { borderRadius: 18, padding: Spacing.three, gap: Spacing.two, alignItems: 'flex-start', borderWidth: 1, borderColor: '#262A31' },
    secondaryButton: { paddingVertical: Spacing.one },
    goalsCard: { borderRadius: 18, padding: Spacing.three, gap: Spacing.two, backgroundColor: '#14161A', borderWidth: 1, borderColor: '#262A31' },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262A31' },
    goalMain: { flex: 1, gap: 3 },
    deleteText: { color: '#D64B52', fontSize: 13 },
    error: { color: '#D64B52' },
    syncWarning: { gap: Spacing.one },
    dialogBackdrop: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
    dialogCard: { width: '100%', maxWidth: 420, borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
    destructiveButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, backgroundColor: '#D64B52' },
    destructiveText: { color: '#FFFFFF', fontWeight: '700' },
    clearButton: { alignSelf: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
    modalPage: { flex: 1 },
    modalFlex: { flex: 1 },
    modalContent: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
    modalTitle: { fontSize: 28, lineHeight: 34, marginBottom: Spacing.two },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
    fieldGroup: { flexGrow: 1, flexBasis: 180, gap: Spacing.one },
    input: { minHeight: 46, borderWidth: 1, borderColor: '#262A31', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#F4F6F8', backgroundColor: '#090A0C' },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
    cancelButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, backgroundColor: '#1C1F25' },
  });
}
