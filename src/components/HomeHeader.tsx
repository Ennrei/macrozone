import { colors } from '@/styles/global';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.header}>
      <View style={styles.dateRow}>
        <View style={styles.dot} />
        <Text style={styles.date}>{currentDate.toUpperCase()}</Text>
      </View>
      <Text style={styles.greeting}>{greeting}.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.textSecondary,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
    letterSpacing: -0.5,
  },
});