import { Meal } from '@/storage/meals';
import { colors } from '@/styles/global';
import { buildSummary } from '@/utils/macros';
import { Ionicons } from '@expo/vector-icons';
import { Share, StyleSheet, TouchableOpacity } from 'react-native';

type ShareButtonProps = {
  meals: Meal[];
};

export default function ShareButton({ meals }: ShareButtonProps) {
  const handleShare = async () => {
    await Share.share({ message: buildSummary(meals) });
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleShare}
      activeOpacity={0.8}
    >
      <Ionicons name='share-outline' size={20} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});