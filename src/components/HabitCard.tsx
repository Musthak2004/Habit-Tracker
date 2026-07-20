import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Habit } from '../types';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface HabitCardProps {
  habit: Habit;
  onPress?: () => void;
}

export default function HabitCard({ habit, onPress }: HabitCardProps) {
  const { getStreak, dispatch } = useApp();

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            dispatch({ type: 'DELETE_HABIT', id: habit.id });
          },
        },
      ]
    );
  };
  const today = new Date().toISOString().split('T')[0];
  const currentCount = habit.completions[today] ?? 0;
  const done = currentCount >= habit.targetCount;
  const streak = getStreak(habit.id);

  const isVolume = habit.type === 'volume';

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        onLongPress={handleDelete}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {/* Checkbox / Progress circle */}
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : isVolume ? (
            <Text style={styles.countText}>+</Text>
          ) : null}
        </View>

        <View style={styles.textCol}>
          <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.metaRow}>
            {isVolume ? (
              <Text style={[styles.meta, done && styles.metaDone]}>
                {currentCount}/{habit.targetCount}
              </Text>
            ) : (
              <Text style={styles.meta}>
                {done ? 'Done' : 'Tap to complete'}
              </Text>
            )}
            <Text style={styles.separator}>·</Text>
            <Text style={styles.streak}>
              🔥 {streak.current}d
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action button */}
      {!done && (
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <Text style={styles.actionIcon}>
            {isVolume ? '+' : '✓'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDone: {
    backgroundColor: '#f0fdf4',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxDone: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6c63ff',
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  nameDone: {
    color: '#22c55e',
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
  metaDone: {
    color: '#22c55e',
    fontWeight: '600',
  },
  separator: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 2,
  },
  streak: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
});
