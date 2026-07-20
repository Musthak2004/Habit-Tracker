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

interface CreateChallengeScreenProps {
  navigation: any;
}

const DURATION_OPTIONS = [3, 5, 7, 14, 21, 30];
const EMOJI_OPTIONS = ['🏆', '🥇', '🔥', '💪', '🎯', '⭐', '🌟', '🏅', '👑', '🚀'];

export default function CreateChallengeScreen({ navigation }: CreateChallengeScreenProps) {
  const { state, dispatch } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [reward, setReward] = useState('');
  const [rewardEmoji, setRewardEmoji] = useState('🏆');
  const [requiredDaily, setRequiredDaily] = useState(1);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const activeHabits = state.habits.filter((h) => !h.archived);

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your challenge a name.');
      return;
    }
    if (!reward.trim()) {
      Alert.alert('Reward required', 'What reward will completing this challenge unlock?');
      return;
    }

    triggerHaptic('success');

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + durationDays);
    const todayStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    dispatch({
      type: 'ADD_CHALLENGE',
      challenge: {
        id: 'challenge-' + Date.now(),
        habitId: selectedHabitId,
        name: name.trim(),
        description: description.trim() || `Complete ${requiredDaily} habit${requiredDaily > 1 ? 's' : ''} daily for ${durationDays} days`,
        durationDays,
        startDate: todayStr,
        endDate: endStr,
        requiredDaily,
        reward: reward.trim(),
        rewardEmoji,
        completed: false,
        claimedAt: null,
        isOnboarding: false,
      },
    });

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Challenge</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Challenge Name */}
          <Text style={styles.label}>Challenge Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7-Day Morning Routine"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />

          {/* Description */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your challenge..."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          {/* Duration */}
          <Text style={styles.label}>Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, durationDays === d && styles.chipActive]}
                onPress={() => { setDurationDays(d); triggerHaptic('light'); }}
              >
                <Text style={[styles.chipText, durationDays === d && styles.chipTextActive]}>
                  {d} days
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Required Daily */}
          <Text style={styles.label}>Required per Day</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => { if (requiredDaily > 1) setRequiredDaily(requiredDaily - 1); triggerHaptic('light'); }}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{requiredDaily}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => { if (requiredDaily < 10) setRequiredDaily(requiredDaily + 1); triggerHaptic('light'); }}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Reward */}
          <Text style={styles.label}>Reward</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Treat yourself to a movie"
            placeholderTextColor="#999"
            value={reward}
            onChangeText={setReward}
            maxLength={100}
          />

          {/* Reward Emoji */}
          <Text style={styles.label}>Reward Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiChip, rewardEmoji === e && styles.emojiChipActive]}
                onPress={() => { setRewardEmoji(e); triggerHaptic('light'); }}
              >
                <Text style={[styles.emojiText, rewardEmoji === e && styles.emojiTextActive]}>
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Link to Habit (optional) */}
          {activeHabits.length > 0 && (
            <>
              <Text style={styles.label}>Link to Habit (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.habitChip, selectedHabitId === null && styles.habitChipActive]}
                  onPress={() => { setSelectedHabitId(null); triggerHaptic('light'); }}
                >
                  <Text style={[styles.habitChipText, selectedHabitId === null && styles.habitChipTextActive]}>
                    Any Habit
                  </Text>
                </TouchableOpacity>
                {activeHabits.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.habitChip, selectedHabitId === h.id && styles.habitChipActive]}
                    onPress={() => { setSelectedHabitId(h.id); triggerHaptic('light'); }}
                  >
                    <Text style={[styles.habitChipText, selectedHabitId === h.id && styles.habitChipTextActive]}>
                      {h.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 Challenge Summary</Text>
            <Text style={styles.summaryText}>
              {rewardEmoji} {name || 'Unnamed Challenge'}{'\n'}
              📅 {durationDays} days — {requiredDaily} per day{'\n'}
              🎁 {reward || 'No reward set'}
              {selectedHabitId ? '\n🔗 Linked to a specific habit' : '\n🔗 Tracks any habit'}
            </Text>
          </View>

          {/* Create */}
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.85}>
            <Text style={styles.createText}>🚀 Start Challenge</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5ff' },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  cancelText: { fontSize: 16, color: '#6c63ff', fontWeight: '500' },
  placeholder: { width: 60 },
  content: { padding: 24, paddingBottom: 48, gap: 20 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f6',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: '#6c63ff', backgroundColor: '#ede9fe' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#666' },
  chipTextActive: { color: '#6c63ff' },
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
  counterBtnText: { fontSize: 24, color: '#fff', fontWeight: '600' },
  counterValue: { fontSize: 36, fontWeight: '800', color: '#1a1a2e', minWidth: 40, textAlign: 'center' },
  emojiChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiChipActive: { borderColor: '#6c63ff', backgroundColor: '#ede9fe' },
  emojiText: { fontSize: 24 },
  emojiTextActive: { fontSize: 26 },
  habitChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f6',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  habitChipActive: { borderColor: '#6c63ff', backgroundColor: '#ede9fe' },
  habitChipText: { fontSize: 14, fontWeight: '700', color: '#666' },
  habitChipTextActive: { color: '#6c63ff' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e8e0ff',
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#555', lineHeight: 22 },
  createBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
