import { deleteMeal } from '@/storage/meals';
import { colors } from '@/styles/global';
import { confirmAction } from '@/utils/dialog';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type MealItemProps = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt?: string;
  onDelete: () => void;
};

export default function MealItem({
  id,
  name,
  calories,
  protein,
  carbs,
  fat,
  createdAt,
  onDelete,
}: MealItemProps) {
  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const confirmDelete = () => {
    confirmAction(
      'Delete Meal',
      `Are you sure you want to delete "${name}"?`,
      async () => {
        await deleteMeal(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onDelete();
      },
    );
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    confirmDelete();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onLongPress={handleLongPress}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
        <View style={styles.chips}>
          <Chip letter='P' value={protein} color={colors.protein} />
          <Chip letter='C' value={carbs} color={colors.carbs} />
          <Chip letter='F' value={fat} color={colors.fat} />
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.calories}>{calories}</Text>
        <Text style={styles.kcal}>KCAL</Text>
      </View>

      <Pressable style={styles.trash} onPress={confirmDelete} hitSlop={8}>
        <Ionicons name='trash-outline' size={18} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

function Chip({
  letter,
  value,
  color,
}: {
  letter: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>
        {letter} {value}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.surfaceHigh,
  },
  left: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  right: {
    alignItems: 'flex-end',
  },
  calories: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  kcal: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  trash: {
    paddingLeft: 4,
  },
});