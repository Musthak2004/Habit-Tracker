import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useCoaching } from '../context/CoachingContext';
import { triggerHaptic } from '../utils/haptics';
import { SCENARIOS } from '../lib/seed-data';
import { showNotificationToast } from '../components/NotificationToast';

interface DeveloperScreenProps {
  navigation: any;
}

export default function DeveloperScreen({ navigation }: DeveloperScreenProps) {
  const { state, dispatch, getActiveChallenges, getTodayCompletions } = useApp();
  const { coachingDispatch } = useCoaching();
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Suggest a date N days ago
  const setOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setCustomDate(d.toISOString().split('T')[0]);
  };

  // Toggle a habit on a specific date
  const toggleHabitOnDate = useCallback(
    (habitId: string) => {
      dispatch({ type: 'TOGGLE_HABIT', id: habitId, date: customDate });
      triggerHaptic('light');
    },
    [dispatch, customDate]
  );

  // Complete all challenges
  const completeChallenge = (challengeId: string) => {
    dispatch({ type: 'COMPLETE_CHALLENGE', id: challengeId });
    triggerHaptic('success');
  };

  // Manually claim reward for a challenge
  const claimReward = (challengeId: string) => {
    dispatch({ type: 'CLAIM_REWARD', id: challengeId });
    triggerHaptic('success');
  };

  // Simulate completing 3 days for onboarding challenge
  const simulateThreeDayChallenge = () => {
    const activeChallenges = getActiveChallenges();
    const onboarding = activeChallenges.find((c) => c.isOnboarding);
    if (!onboarding) {
      Alert.alert('No onboarding challenge', 'Create one by resetting onboarding.');
      return;
    }

    // Complete all habits for each day of the challenge
    const start = new Date(onboarding.startDate + 'T00:00:00');
    for (let i = 0; i < onboarding.durationDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      state.habits.forEach((h) => {
        if (h.archived) return;
        const current = h.completions[dateStr] ?? 0;
        if (current < h.targetCount) {
          // Set exactly to targetCount in one dispatch (avoids batched stale-state bug)
          dispatch({ type: 'SET_COMPLETION', id: h.id, date: dateStr, count: h.targetCount });
        }
      });
    }

    dispatch({ type: 'COMPLETE_CHALLENGE', id: onboarding.id });
    Alert.alert('Simulated!', `Challenge "${onboarding.name}" completed across all ${onboarding.durationDays} days.`);
    triggerHaptic('success');
  };

  // Simulate challenge completion by adding completions for remaining dates
  const simulateChallengeDay = (challengeId: string) => {
    const challenge = state.challenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    const start = new Date(challenge.startDate + 'T00:00:00');
    const end = new Date(challenge.endDate + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      state.habits.forEach((h) => {
        if (challenge.habitId && h.id !== challenge.habitId) return;
        if (h.archived) return;
        const current = h.completions[dateStr] ?? 0;
        if (current < h.targetCount) {
          dispatch({ type: 'SET_COMPLETION', id: h.id, date: dateStr, count: h.targetCount });
        }
      });
    }

    dispatch({ type: 'COMPLETE_CHALLENGE', id: challenge.id });
    Alert.alert('Challenge completed!', `"${challenge.name}" has been completed across all dates.`);
    triggerHaptic('success');
  };

  // Reset onboarding so it shows again
  const resetOnboarding = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { onboardingComplete: false },
    });
    Alert.alert('Reset', 'Onboarding will show on next app load.');
  };

  // Clear all data
  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all habits, challenges, and settings. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'CLEAR_ALL' });
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ]
    );
  };

  // Seed test data for a scenario
  const seedScenario = (index: number) => {
    const scenario = SCENARIOS[index];
    Alert.alert(
      `${scenario.emoji} Seed: ${scenario.name}`,
      `This will clear all current data and load: ${scenario.habits.length} habits, ${scenario.challenges.length} challenge, ${scenario.nudges.length} nudges, ${scenario.reflections.length} reflections.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed Data',
          onPress: () => {
            dispatch({ type: 'CLEAR_ALL' });

            // Use requestAnimationFrame to let the clear settle
            requestAnimationFrame(() => {
              // Add habits
              scenario.habits.forEach((h) => {
                dispatch({ type: 'ADD_HABIT', habit: h });
              });

              // Add challenges
              scenario.challenges.forEach((c) => {
                dispatch({ type: 'ADD_CHALLENGE', challenge: c });
              });

              // Add coaching nudges via the coaching dispatch
              scenario.nudges.forEach((n) => {
                coachingDispatch({ type: 'ADD_NUDGE', nudge: n });
              });

              // Add reflections via the coaching dispatch
              scenario.reflections.forEach((r) => {
                coachingDispatch({ type: 'ADD_REFLECTION', reflection: r });
              });

              triggerHaptic('success');
              Alert.alert(
                'Done',
                `${scenario.emoji} "${scenario.name}" seeded! Refresh the home screen to see the data.`
              );
            });
          },
        },
      ]
    );
  };

  const activeChallenges = getActiveChallenges();
  const today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛠️ Developer Console</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date override */}
        <Text style={styles.sectionTitle}>Date Override</Text>
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Set a custom date for the toggle action below. This lets you simulate previous days.
          </Text>
          <TextInput
            style={styles.dateInput}
            value={customDate}
            onChangeText={setCustomDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
          <View style={styles.dateQuickRow}>
            {[-2, -1, 0, 1, 2, 3].map((offset) => (
              <TouchableOpacity
                key={offset}
                style={styles.dateQuickBtn}
                onPress={() => setOffset(offset)}
              >
                <Text style={styles.dateQuickText}>
                  {offset === 0 ? 'Today' : offset > 0 ? `+${offset}` : `${offset}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick toggle */}
        <Text style={styles.sectionTitle}>Toggle Habits (on date: {customDate})</Text>
        <View style={styles.card}>
          {state.habits.filter((h) => !h.archived).length === 0 ? (
            <Text style={styles.emptyText}>No habits created yet</Text>
          ) : (
            state.habits
              .filter((h) => !h.archived)
              .map((h) => {
                const count = h.completions[customDate] ?? 0;
                const done = count >= h.targetCount;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.habitRow, done && styles.habitRowDone]}
                    onPress={() => toggleHabitOnDate(h.id)}
                  >
                    <Text style={styles.habitRowIcon}>
                      {done ? '✅' : '⭕'}
                    </Text>
                    <View style={styles.habitRowText}>
                      <Text style={styles.habitRowName}>{h.name}</Text>
                      <Text style={styles.habitRowCount}>
                        {count}/{h.targetCount} {done ? '(done)' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
        </View>

        {/* Challenge Controls */}
        <Text style={styles.sectionTitle}>Challenge Controls</Text>

        {activeChallenges.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No active challenges</Text>
          </View>
        ) : (
          activeChallenges.map((ch) => (
            <View key={ch.id} style={styles.card}>
              <Text style={styles.challengeName}>
                {ch.rewardEmoji} {ch.name}
              </Text>
              <Text style={styles.cardDesc}>
                {ch.startDate} → {ch.endDate} ({ch.durationDays} days)
                {ch.completed ? ' ✅ Completed' : ''}
                {ch.claimedAt ? ' 🎁 Claimed' : ''}
              </Text>
              <View style={styles.challengeActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => completeChallenge(ch.id)}
                >
                  <Text style={styles.actionBtnText}>Mark Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => claimReward(ch.id)}
                >
                  <Text style={styles.actionBtnText}>Claim Reward</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnGreen]}
                  onPress={() => simulateChallengeDay(ch.id)}
                >
                  <Text style={styles.actionBtnText}>Simulate All Days</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Simulate 3-Day Kickstart */}
        <Text style={styles.sectionTitle}>Kickstart Simulator</Text>
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Automatically complete all habits for every day of the onboarding 3-day challenge and mark it done.
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={simulateThreeDayChallenge}>
            <Text style={styles.bigBtnText}>🚀 Simulate Complete 3-Day Challenge</Text>
          </TouchableOpacity>
        </View>

        {/* State inspector */}
        <Text style={styles.sectionTitle}>State Inspector</Text>
        <View style={styles.card}>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Habits: </Text>
            {state.habits.length} ({state.habits.filter((h) => !h.archived).length} active)
          </Text>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Challenges: </Text>
            {state.challenges.length} ({activeChallenges.length} active)
          </Text>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Onboarding: </Text>
            {state.settings.onboardingComplete ? '✅ Done' : '❌ Not done'}
          </Text>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Notifications: </Text>
            {state.settings.notificationsEnabled ? '✅ On' : '❌ Off'} @ {state.settings.notificationTime}
          </Text>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Sound: </Text>
            {state.settings.soundEnabled ? '✅ On' : '❌ Off'}
          </Text>
          <Text style={styles.inspectRow}>
            <Text style={styles.inspectLabel}>Haptics: </Text>
            {state.settings.hapticsEnabled ? '✅ On' : '❌ Off'}
          </Text>
        </View>

        {/* Simulate Push Notification */}
        <Text style={styles.sectionTitle}>Test Notification</Text>
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Trigger a simulated push notification banner to see how nudges and reminders look in the app.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={styles.seedTestBtn}
              onPress={() => {
                showNotificationToast({
                  id: 'test-coaching',
                  title: 'Coaching Nudge',
                  body: 'You are on a 7 day streak for Morning Meditation! Keep it going.',
                });
                triggerHaptic('light');
              }}
            >
              <Text style={styles.seedTestBtnText}>💪 Coaching</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.seedTestBtn}
              onPress={() => {
                showNotificationToast({
                  id: 'test-suggestion',
                  title: 'Habit Tip',
                  body: 'Try keeping your water bottle on your desk. Visual cues boost consistency by 40%.',
                });
                triggerHaptic('light');
              }}
            >
              <Text style={styles.seedTestBtnText}>💡 Suggestion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.seedTestBtn}
              onPress={() => {
                showNotificationToast({
                  id: 'test-insight',
                  title: 'Habit Insight',
                  body: 'Your consistency drops on weekends. Try pairing one habit with your morning coffee.',
                });
                triggerHaptic('light');
              }}
            >
              <Text style={styles.seedTestBtnText}>🔍 Insight</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.seedTestBtn}
              onPress={() => {
                showNotificationToast({
                  id: 'test-reflection',
                  title: 'Weekly Report Ready',
                  body: 'Your weekly reflection report is ready. Overall consistency: 76%. View it in History.',
                });
                triggerHaptic('light');
              }}
            >
              <Text style={styles.seedTestBtnText}>📊 Reflection</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seed Test Data */}
        <Text style={styles.sectionTitle}>Seed Test Data</Text>
        <Text style={[styles.cardDesc, { paddingHorizontal: 0, marginTop: -4 }]}>
          Quickly load simulated habits with history. Clears existing data first.
        </Text>
        {SCENARIOS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.seedCard}
            onPress={() => seedScenario(i)}
            activeOpacity={0.7}
          >
            <View style={styles.seedCardLeft}>
              <Text style={styles.seedCardEmoji}>{s.emoji}</Text>
              <View style={styles.seedCardText}>
                <Text style={styles.seedCardName}>{s.name}</Text>
                <Text style={styles.seedCardDesc}>{s.description}</Text>
              </View>
            </View>
            <Text style={styles.seedCardArrow}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Reset & Debug */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={resetOnboarding}>
          <Text style={styles.dangerBtnText}>🔄 Reset Onboarding</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearAllData}>
          <Text style={styles.dangerBtnText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  closeText: { fontSize: 16, color: '#6c63ff', fontWeight: '500' },
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 12 },
  dateInput: {
    borderWidth: 1.5,
    borderColor: '#c0c4d0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#f8f8ff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  dateQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dateQuickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  dateQuickText: { fontSize: 12, fontWeight: '600', color: '#555' },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  habitRowDone: { backgroundColor: '#f0fdf4', borderRadius: 8, marginBottom: 2, padding: 10, borderBottomWidth: 0 },
  habitRowIcon: { fontSize: 20, marginRight: 12 },
  habitRowText: { flex: 1 },
  habitRowName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  habitRowCount: { fontSize: 12, color: '#666', marginTop: 2 },
  challengeName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  challengeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#6c63ff',
  },
  actionBtnGreen: { backgroundColor: '#22c55e' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bigBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  bigBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  inspectRow: { fontSize: 13, color: '#555', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inspectLabel: { fontWeight: '700', color: '#1a1a2e' },
  seedCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  seedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seedCardEmoji: { fontSize: 28, marginRight: 12 },
  seedCardText: { flex: 1 },
  seedCardName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  seedCardDesc: { fontSize: 12, color: '#777', lineHeight: 16 },
  seedCardArrow: { fontSize: 18, color: '#ccc', marginLeft: 8 },
  seedTestBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f0edff',
    borderWidth: 1.5,
    borderColor: '#d4d0ff',
  },
  seedTestBtnText: { fontSize: 13, fontWeight: '600', color: '#6c63ff' },
  dangerBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    marginBottom: 10,
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
