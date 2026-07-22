import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useCoaching } from '../context/CoachingContext';
import { triggerHaptic } from '../utils/haptics';
import { playChime, playRewardFanfare } from '../utils/sounds';
import HabitCard from '../components/HabitCard';
import ChallengeCard from '../components/ChallengeCard';
import RewardOverlay from '../components/RewardOverlay';
import CoachingNudgeCard from '../components/CoachingNudgeCard';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    state,
    dispatch,
    getTodayCompletions,
    getTodayProgress,
    getActiveChallenges,
  } = useApp();
  const {
    activeNudge,
    generateNudge,
    dismissNudge,
    state: coachingState,
    isAIConfigured,
  } = useCoaching();

  const todayCompletions = getTodayCompletions();
  const progress = getTodayProgress();
  const activeChallenges = getActiveChallenges();

  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardData, setRewardData] = useState({ title: '', subtitle: '', emoji: '' });

  // Auto-generation is handled by CoachingContext (app foreground detection).
  // This effect is kept as a safety net for the case where the context's
  // AppState listener fires before the component has mounted.
  useEffect(() => {
    if (!isAIConfigured || !coachingState.settings.coachingEnabled) return;
    if (!coachingState.loaded || coachingState.generating) return;
    if (activeNudge) return; // Already have one to show
    generateNudge();
    // Only fire once on mount — the context handles re-generation on foreground
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachingState.loaded, isAIConfigured]);

  const showReward = useCallback(
    (title: string, subtitle: string, emoji: string) => {
      setRewardData({ title, subtitle, emoji });
      setRewardVisible(true);
      playRewardFanfare();
    },
    []
  );

  const handleToggleHabit = useCallback(
    (habitId: string) => {
      const habit = state.habits.find((h) => h.id === habitId);
      if (!habit) return;

      const today = new Date().toISOString().split('T')[0];
      const currentCount = habit.completions[today] ?? 0;

      if (habit.type === 'volume') {
        // Volume habit: increment
        const nextCount = currentCount + 1;
        if (nextCount > habit.targetCount) return; // already done

        dispatch({
          type: 'INCREMENT_HABIT',
          id: habitId,
          date: today,
          maxCount: habit.targetCount,
        });

        // Haptic on every increment
        triggerHaptic('light');

        if (nextCount >= habit.targetCount) {
          // Fully complete — reward!
          triggerHaptic('success');
          if (state.settings.soundEnabled) playChime();
          showReward(
            '✓ Habit Complete!',
            `${habit.name} — ${nextCount}/${habit.targetCount} done!`,
            '🎯'
          );

          // Check if any challenge is affected
          checkChallengeProgress(habitId);
        }
      } else {
        // Boolean habit: toggle
        const newDone = !currentCount;
        dispatch({
          type: 'TOGGLE_HABIT',
          id: habitId,
          date: today,
        });

        if (newDone) {
          triggerHaptic('success');
          if (state.settings.soundEnabled) playChime();
          showReward(
            '✓ Done!',
            `${habit.name} — You're on a roll!`,
            '🌟'
          );
          checkChallengeProgress(habitId);
        } else {
          triggerHaptic('medium');
        }
      }
    },
    [state.habits, state.settings, dispatch, showReward]
  );

  const checkChallengeProgress = useCallback(
    (habitId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const active = activeChallenges;

      for (const challenge of active) {
        // Check if this habit contributes
        if (challenge.habitId !== null && challenge.habitId !== habitId) continue;

        // Count total habits done today
        const todayData = getTodayCompletions();
        const doneToday = todayData.filter((t) => t.done).length;

        if (doneToday >= challenge.requiredDaily) {
          // Check if all days are done
          const allDaysMet = checkAllDaysMet(challenge);
          if (allDaysMet && !challenge.completed) {
            dispatch({ type: 'COMPLETE_CHALLENGE', id: challenge.id });
            showReward(
              '🏆 Challenge Complete!',
              challenge.reward,
              challenge.rewardEmoji
            );
          }
        }
      }
    },
    [activeChallenges, getTodayCompletions, dispatch, showReward]
  );

  const checkAllDaysMet = (challenge: any): boolean => {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const end = new Date(challenge.endDate + 'T00:00:00');
    const now = new Date();

    for (let d = new Date(start); d <= end && d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const todayData = getTodayCompletions().filter((t) => {
        const h = state.habits.find((hab) => hab.id === t.habit.id);
        if (!h) return false;
        if (challenge.habitId && h.id !== challenge.habitId) return false;
        return h.completions[dateStr] >= h.targetCount;
      });
      if (todayData.length < challenge.requiredDaily) return false;
    }
    return true;
  };

  const calculateChallengeProgress = (challenge: any) => {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const end = new Date(challenge.endDate + 'T00:00:00');
    const total = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    let met = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const habitsForDay = state.habits.filter((h) => {
        if (challenge.habitId && h.id !== challenge.habitId) return false;
        return (h.completions[dateStr] ?? 0) >= h.targetCount;
      });
      if (habitsForDay.length >= challenge.requiredDaily) met++;
    }

    return met / total;
  };

  const renderHeader = () => {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
      <View>
        {/* Greeting */}
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Today</Text>
          <Text style={styles.subtitle}>
            {progress.done}/{progress.total} done
          </Text>
        </View>

        {/* Daily progress ring */}
        {progress.total > 0 && (
          <View style={styles.progressRing}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{pct}% today</Text>
          </View>
        )}

        {/* AI Coaching Nudge */}
        {coachingState.settings.coachingEnabled && activeNudge && (
          <CoachingNudgeCard
            nudge={activeNudge}
            onDismiss={dismissNudge}
            onGenerateNew={() => generateNudge()}
            loading={coachingState.generating}
          />
        )}
        {coachingState.settings.coachingEnabled && coachingState.generating && !activeNudge && (
          <CoachingNudgeCard
            onDismiss={() => {}}
            loading={true}
          />
        )}

        {/* Challenges header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🏆 Challenges</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateChallenge')}
            style={styles.createChallengeBtn}
          >
            <Text style={styles.createChallengeText}>+ New</Text>
          </TouchableOpacity>
        </View>
        {activeChallenges.length > 0 ? (
          activeChallenges.map((ch) => (
            <ChallengeCard
              key={ch.id}
              challenge={ch}
              progress={calculateChallengeProgress(ch)}
              daysRemaining={Math.max(
                0,
                Math.ceil(
                  (new Date(ch.endDate).getTime() - Date.now()) / 86400000
                )
              )}
              onPress={() => navigation.navigate('Challenge', { challengeId: ch.id })}
            />
          ))
        ) : (
          <TouchableOpacity
            style={styles.createFirstChallenge}
            onPress={() => navigation.navigate('CreateChallenge')}
            activeOpacity={0.8}
          >
            <Text style={styles.createFirstChallengeEmoji}>🏆</Text>
            <Text style={styles.createFirstChallengeTitle}>Start a Challenge</Text>
            <Text style={styles.createFirstChallengeDesc}>
              Create a custom challenge to push yourself further!
            </Text>
          </TouchableOpacity>
        )}

        {/* Habits header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 My Habits</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5ff" />

      <FlatList
        data={todayCompletions}
        keyExtractor={(item) => item.habit.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to create your first habit
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item.habit}
            onPress={() => handleToggleHabit(item.habit.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          triggerHaptic('light');
          navigation.navigate('AddHabit');
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navIconActive}>📋</Text>
          <Text style={styles.navLabelActive}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Reward overlay */}
      <RewardOverlay
        visible={rewardVisible}
        title={rewardData.title}
        subtitle={rewardData.subtitle}
        emoji={rewardData.emoji}
        onComplete={() => setRewardVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff',
  },
  list: {
    padding: 20,
    paddingBottom: 120,
  },
  headerContent: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
  progressRing: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e8e0ff',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  createChallengeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#6c63ff',
  },
  createChallengeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  createFirstChallenge: {
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4d0ff',
  },
  createFirstChallengeEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  createFirstChallengeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6c63ff',
    marginBottom: 6,
  },
  createFirstChallengeDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 8px rgba(108, 99, 255, 0.35)',
    elevation: 6,
  },
  fabText: {
    fontSize: 30,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '300',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
    elevation: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 2,
    opacity: 0.5,
  },
  navIconActive: {
    fontSize: 22,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '500',
  },
  navLabelActive: {
    fontSize: 11,
    color: '#6c63ff',
    fontWeight: '600',
  },
});
