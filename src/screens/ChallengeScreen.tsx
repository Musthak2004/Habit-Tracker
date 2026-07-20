import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { playRewardFanfare } from '../utils/sounds';
import RewardOverlay from '../components/RewardOverlay';
import { Challenge } from '../types';

interface ChallengeScreenProps {
  navigation: any;
  route: any;
}

export default function ChallengeScreen({ navigation, route }: ChallengeScreenProps) {
  const { state, dispatch, getTodayCompletions } = useApp();
  const challengeId = route?.params?.challengeId;
  const challenge = state.challenges.find((c) => c.id === challengeId);

  const [rewardVisible, setRewardVisible] = useState(false);

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No Challenge Active</Text>
          <Text style={styles.emptySubtitle}>
            Complete the onboarding to start your first challenge!
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate progress
  const start = new Date(challenge.startDate + 'T00:00:00');
  const end = new Date(challenge.endDate + 'T00:00:00');
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const elapsed = Math.max(0, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000) + 1));
  const daysRemaining = Math.max(0, totalDays - elapsed);

  // Check each day
  interface DayStatus {
    date: string;
    met: boolean;
    isFuture: boolean;
    isToday: boolean;
  }

  const days: DayStatus[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isFuture = d.getTime() > Date.now();
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    const habitsForDay = state.habits.filter((h) => {
      if (challenge.habitId && h.id !== challenge.habitId) return false;
      return (h.completions[dateStr] ?? 0) >= h.targetCount;
    });

    days.push({
      date: dateStr,
      met: habitsForDay.length >= challenge.requiredDaily || isFuture,
      isFuture,
      isToday,
    });
  }

  const metDays = days.filter((d) => d.met && !d.isFuture).length;
  const totalActiveDays = days.filter((d) => !d.isFuture).length;
  const progress = totalActiveDays > 0 ? metDays / totalActiveDays : 0;
  const isComplete = progress >= 1 || challenge.completed;

  const handleClaimReward = () => {
    triggerHaptic('success');
    playRewardFanfare();
    dispatch({ type: 'CLAIM_REWARD', id: challenge.id });
    setRewardVisible(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrowText}>← Back</Text>
        </TouchableOpacity>

        {/* Challenge emoji & name */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{challenge.rewardEmoji}</Text>
          <Text style={styles.heroTitle}>{challenge.name}</Text>
          <Text style={styles.heroDesc}>{challenge.description}</Text>
        </View>

        {/* Progress ring */}
        <View style={styles.progressSection}>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 1) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {isComplete
              ? 'Challenge Complete! 🎉'
              : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{metDays}/{totalActiveDays}</Text>
            <Text style={styles.statLabel}>Days Met</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalDays}</Text>
            <Text style={styles.statLabel}>Total Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{challenge.requiredDaily}</Text>
            <Text style={styles.statLabel}>Per Day</Text>
          </View>
        </View>

        {/* Reward */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🎁</Text>
          <View>
            <Text style={styles.rewardTitle}>Reward</Text>
            <Text style={styles.rewardText}>{challenge.reward}</Text>
          </View>
        </View>

        {/* Claim button */}
        {isComplete && !challenge.claimedAt && (
          <TouchableOpacity
            style={styles.claimBtn}
            onPress={handleClaimReward}
            activeOpacity={0.85}
          >
            <Text style={styles.claimText}>🎉 Claim Your Reward!</Text>
          </TouchableOpacity>
        )}
        {challenge.claimedAt && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>
              ✅ Reward claimed on {formatDate(challenge.claimedAt)}
            </Text>
          </View>
        )}

        {/* Day-by-day breakdown */}
        <Text style={styles.sectionTitle}>Day by Day</Text>
        {days.map((day, i) => (
          <View
            key={day.date}
            style={[
              styles.dayRow,
              day.met && !day.isFuture && styles.dayRowMet,
              day.isToday && styles.dayRowToday,
            ]}
          >
            <Text
              style={[
                styles.dayLabel,
                day.isToday && styles.dayLabelToday,
              ]}
            >
              Day {i + 1}
            </Text>
            <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
            {day.isFuture ? (
              <Text style={styles.dayStatus}>⏳ Upcoming</Text>
            ) : day.met ? (
              <Text style={styles.dayStatusMet}>✅ Done</Text>
            ) : (
              <Text style={styles.dayStatusMissed}>❌ Missed</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <RewardOverlay
        visible={rewardVisible}
        title="🏅 Reward Claimed!"
        subtitle={challenge.reward}
        emoji={challenge.rewardEmoji}
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
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  backArrow: {
    marginBottom: 16,
  },
  backArrowText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6c63ff',
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressPct: {
    fontSize: 48,
    fontWeight: '800',
    color: '#6c63ff',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e8e0ff',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  rewardEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 4,
  },
  rewardText: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '500',
  },
  claimBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  claimedBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  claimedText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  dayRowMet: {
    backgroundColor: '#f0fdf4',
  },
  dayRowToday: {
    borderWidth: 1.5,
    borderColor: '#6c63ff',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    width: 50,
  },
  dayLabelToday: {
    color: '#6c63ff',
  },
  dayDate: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  dayStatus: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  dayStatusMet: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
  dayStatusMissed: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
});
