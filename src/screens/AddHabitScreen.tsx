import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { HabitType } from '../types';

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '12:00',
  '17:00', '18:00', '19:00', '20:00', '21:00',
];

interface AddHabitScreenProps {
  navigation: any;
}

export default function AddHabitScreen({ navigation }: AddHabitScreenProps) {
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('boolean');
  const [targetCount, setTargetCount] = useState('3');
  const [notificationTime, setNotificationTime] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name for your habit.');
      return;
    }

    triggerHaptic('success');

    const habit: import('../types').Habit = {
      id: Date.now().toString(),
      name: trimmed,
      type,
      targetCount: type === 'volume' ? Math.max(1, parseInt(targetCount, 10) || 3) : 1,
      createdAt: new Date().toISOString(),
      completions: {},
      archived: false,
      notificationTime: notificationTime || undefined,
    };

    dispatch({ type: 'ADD_HABIT', habit });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Habit</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning Run, Read 10 Pages, Meditate"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={60}
          />

          {/* Type selector */}
          <Text style={styles.label}>Habit Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeCard,
                type === 'boolean' && styles.typeCardActive,
              ]}
              onPress={() => {
                setType('boolean');
                triggerHaptic('light');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.typeEmoji,
                  type === 'boolean' && styles.typeEmojiActive,
                ]}
              >
                ✅
              </Text>
              <Text
                style={[
                  styles.typeTitle,
                  type === 'boolean' && styles.typeTitleActive,
                ]}
              >
                Daily Goal
              </Text>
              <Text style={styles.typeDesc}>
                Do it once per day{'\n'}Simple check-in
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCard,
                type === 'volume' && styles.typeCardActive,
              ]}
              onPress={() => {
                setType('volume');
                triggerHaptic('light');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.typeEmoji,
                  type === 'volume' && styles.typeEmojiActive,
                ]}
              >
                🔄
              </Text>
              <Text
                style={[
                  styles.typeTitle,
                  type === 'volume' && styles.typeTitleActive,
                ]}
              >
                Volume Goal
              </Text>
              <Text style={styles.typeDesc}>
                Do it N times per day{'\n'}Track quantity
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target count for volume habits */}
          {type === 'volume' && (
            <View>
              <Text style={styles.label}>Times per day</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => {
                    const val = parseInt(targetCount, 10) || 1;
                    if (val > 1) setTargetCount(String(val - 1));
                    triggerHaptic('light');
                  }}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{targetCount}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => {
                    const val = parseInt(targetCount, 10) || 1;
                    if (val < 99) setTargetCount(String(val + 1));
                    triggerHaptic('light');
                  }}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notification time */}
          <Text style={styles.label}>Reminder Time (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.timeChip, notificationTime === null && styles.timeChipActive]}
              onPress={() => { setNotificationTime(null); triggerHaptic('light'); }}
            >
              <Text style={[styles.timeChipText, notificationTime === null && styles.timeChipTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {TIME_OPTIONS.map((time) => {
              const [h, m] = time.split(':');
              const isAM = parseInt(h) < 12;
              const display = `${h}:${m} ${isAM ? 'AM' : 'PM'}`;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, notificationTime === time && styles.timeChipActive]}
                  onPress={() => { setNotificationTime(time); triggerHaptic('light'); }}
                >
                  <Text style={[styles.timeChipText, notificationTime === time && styles.timeChipTextActive]}>
                    {display}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Create button */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            activeOpacity={0.85}
          >
            <Text style={styles.createText}>Create Habit</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff',
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cancelText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '500',
  },
  placeholder: {
    width: 50,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#c0c4d0',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#1a1a2e',
    backgroundColor: '#fff',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#f5f5f8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#6c63ff',
    backgroundColor: '#ede9fe',
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.7,
  },
  typeEmojiActive: {
    opacity: 1,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a4a6a',
    marginBottom: 4,
  },
  typeTitleActive: {
    color: '#6c63ff',
  },
  typeDesc: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a2e',
    minWidth: 60,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#c0c4d0',
  },
  timeChipActive: {
    borderColor: '#6c63ff',
    backgroundColor: '#f8f7ff',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  timeChipTextActive: {
    color: '#6c63ff',
  },
  createBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    boxShadow: '0 4px 8px rgba(108, 99, 255, 0.3)',
    elevation: 6,
  },
  createText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
