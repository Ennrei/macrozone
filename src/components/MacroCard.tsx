import { colors } from '@/styles/global';
import { StyleSheet, Text, View } from 'react-native';

type MacroCardProps = {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color: string;
  hero?: boolean;
};

export default function MacroCard({
  label,
  value,
  goal,
  unit = '',
  color,
  hero = false,
}: MacroCardProps) {
  const progress = goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = value > goal;
  const barColor = over ? colors.alert : color;
  const remaining = Math.max(goal - value, 0);

  return (
    <View style={[styles.card, hero && styles.hero]}>
      <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>

      <View style={styles.valueRow}>
        <Text style={[styles.value, hero && styles.valueHero]}>
          {value.toLocaleString()}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      <Text style={styles.goal}>
        {over
          ? `${(value - goal).toLocaleString()}${unit} over`
          : hero
            ? `${remaining.toLocaleString()} kcal left of ${goal.toLocaleString()}`
            : `of ${goal.toLocaleString()}${unit}`}
      </Text>

      <View style={[styles.track, hero && styles.trackHero]}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
   hero: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
      width: '100%',
      padding: 20,
      borderRadius: 24,
    },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 8,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  valueHero: {
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
  },
  unit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  goal: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHigh,
    marginTop: 14,
    overflow: 'hidden',
  },
  trackHero: {
    height: 10,
    borderRadius: 5,
    marginTop: 18,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});