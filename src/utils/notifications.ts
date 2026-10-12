import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Type-only import (erased at compile time)
type NotificationsType = typeof import('expo-notifications');

let Notifications: NotificationsType | null = null;
let isHandlerSet = false;

// Helper to safely fetch the Notifications module on demand
function getNotificationsModule(): NotificationsType | null {
  // Never attempt to load inside Expo Go
  if (isExpoGo) return null;

  if (!Notifications) {
    try {
      Notifications = require('expo-notifications');
      if (Notifications && Platform.OS !== 'web' && !isHandlerSet) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        isHandlerSet = true;
      }
    } catch {
      console.warn('expo-notifications could not be loaded.');
    }
  }

  return Notifications;
}

// Request notification permissions safely
export async function requestNotificationPermissions(): Promise<boolean> {
  const notifications = getNotificationsModule();
  if (Platform.OS === 'web' || !notifications) return true;

  try {
    const { status: existingStatus } = await notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

// Check calorie thresholds safely across Expo Go, Native, and Web
export async function checkCalorieThresholds(totalCalories: number, targetCalories: number = 2000) {
  if (targetCalories <= 0) return;

  const percentage = (totalCalories / targetCalories) * 100;

  if (percentage >= 100) {
    const title = '⚠️ Calorie Limit Exceeded!';
    const body = `You have consumed ${totalCalories} / ${targetCalories} kcal today. Daily limit reached!`;
    sendAlert(title, body);
  } else if (percentage >= 85) {
    const title = '🔔 Approaching Calorie Limit';
    const body = `You are at ${Math.round(percentage)}% of your daily budget (${totalCalories} / ${targetCalories} kcal).`;
    sendAlert(title, body);
  }
}

// Cross-platform alert dispatcher
function sendAlert(title: string, body: string) {
  const notifications = getNotificationsModule();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      console.log(`${title}: ${body}`);
    }
  } else if (notifications) {
    try {
      notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {
      Alert.alert(title, body);
    }
  } else {
    // Fallback for Expo Go
    Alert.alert(title, body);
  }
}