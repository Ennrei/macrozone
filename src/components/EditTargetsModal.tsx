import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MacroTargets, saveTargets } from '../storage/meals';

interface EditTargetsModalProps {
  visible: boolean;
  currentTargets: MacroTargets;
  onClose: () => void;
  onSave: (updated: MacroTargets) => void;
}

export default function EditTargetsModal({
  visible,
  currentTargets,
  onClose,
  onSave,
}: EditTargetsModalProps) {
  const [calories, setCalories] = useState(String(currentTargets.calories));
  const [protein, setProtein] = useState(String(currentTargets.protein));
  const [carbs, setCarbs] = useState(String(currentTargets.carbs));
  const [fat, setFat] = useState(String(currentTargets.fat));

  const handleSave = async () => {
    const updated: MacroTargets = {
      calories: Number(calories) || currentTargets.calories,
      protein: Number(protein) || currentTargets.protein,
      carbs: Number(carbs) || currentTargets.carbs,
      fat: Number(fat) || currentTargets.fat,
    };

    await saveTargets(updated);
    onSave(updated);
    onClose();
    Alert.alert('Success', 'Nutritional targets updated!');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Edit Daily Targets</Text>

          <Text style={styles.label}>Target Calories (kcal)</Text>
          <TextInput
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Target Protein (g)</Text>
          <TextInput
            style={styles.input}
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Target Carbs (g)</Text>
          <TextInput
            style={styles.input}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Target Fat (g)</Text>
          <TextInput
            style={styles.input}
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save Goals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  label: { color: '#a1a1aa', fontSize: 13, marginBottom: 4 },
  input: {
    backgroundColor: '#09090b',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#27272a',
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontWeight: 'bold' },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#a3e635',
    alignItems: 'center',
  },
  saveText: { color: '#000', fontWeight: 'bold' },
});