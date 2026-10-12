import { Meal } from '@/storage/meals';
import { colors } from '@/styles/global';
import { buildSummary } from '@/utils/macros';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

type CopyButtonProps = {
  meals: Meal[];
};

export default function CopyButton({ meals }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(buildSummary(meals));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);

    Alert.alert('Copied!', 'Macro summary copied to clipboard.');
  };

  return (
    <TouchableOpacity
      style={[styles.button, copied && styles.buttonDone]}
      onPress={handleCopy}
      activeOpacity={0.8}
    >
      <Ionicons
        name={copied ? 'checkmark-circle' : 'copy-outline'}
        size={18}
        color={colors.primary}
      />
      <Text style={styles.text}>{copied ? 'Copied' : 'Copy summary'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonDone: {
    borderColor: colors.primary,
  },
  text: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});