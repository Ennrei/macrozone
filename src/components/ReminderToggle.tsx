// src/components/ReminderToggle.tsx
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

export default function ReminderToggle() {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Meal reminders</Text>
        <Text style={styles.subtitle}>{isEnabled ? 'On' : 'Off'}</Text>
      </View>
      <Switch
        trackColor={{ false: '#27272a', true: '#a3e635' }}
        thumbColor={isEnabled ? '#ffffff' : '#a1a1aa'}
        onValueChange={toggleSwitch}
        value={isEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  textContainer: {
    flexDirection: 'column',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 2,
  },
});