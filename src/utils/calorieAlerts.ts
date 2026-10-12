import { requestNotificationPermissions, sendCalorieNotification } from '@/utils/notifications';
import { Platform } from 'react-native';

export type CalorieStatus = 'ok' | 'near' | 'over';

// Used only when no goal is passed in.
export const DEFAULT_CALORIE_GOAL = 2000;

// "near" starts at 80% of the daily goal.
export const NEAR_RATIO = 0.8;

export function getCalorieStatus(
  calories: number,
  goal: number = DEFAULT_CALORIE_GOAL,
): CalorieStatus {
  if (!goal || goal <= 0) return 'ok';
  if (calories >= goal) return 'over';
  if (calories >= goal * NEAR_RATIO) return 'near';
  return 'ok';
}

export function calorieAlertText(
  status: CalorieStatus,
  total: number,
  goal: number = DEFAULT_CALORIE_GOAL,
): { title: string; body: string } | null {
  if (status === 'near') {
    return {
      title: 'Almost at your limit',
      body: `You've had ${total.toLocaleString()} of ${goal.toLocaleString()} kcal. Only ${(goal - total).toLocaleString()} left today.`,
    };
  }
  if (status === 'over') {
    const over = total - goal;
    return {
      title: over === 0 ? 'Daily goal reached' : 'Over your daily goal',
      body:
        over === 0
          ? `You've reached your ${goal.toLocaleString()} kcal goal for today.`
          : `You're at ${total.toLocaleString()} kcal, ${over.toLocaleString()} over your ${goal.toLocaleString()} kcal goal.`,
    };
  }
  return null;
}

// Phone notification (not available on web).
export async function sendCalorieAlert(title: string, body: string) {
  if (Platform.OS === 'web') return false;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;

    // Call the safe dispatcher function from utils/notifications.ts
    return await sendCalorieNotification(title, body);
  } catch {
    return false;
  }
}