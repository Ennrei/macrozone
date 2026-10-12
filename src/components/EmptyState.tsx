import { colors } from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EmptyState() {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name='restaurant-outline' size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>Nothing logged yet</Text>
      <Text style={styles.sub}>Add your first meal to start tracking.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/add-meal')}
      >
        <Ionicons name='add' size={18} color={colors.background} />
        <Text style={styles.buttonText}>Add meal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginTop: 18,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: 14,
  },
});