import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Challenge } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  progress: number;      // 0-1
  daysRemaining: number;
  onPress: () => void;
}

export default function ChallengeCard({
  challenge,
  progress,
  daysRemaining,
  onPress,
}: ChallengeCardProps) {
  const isComplete = progress >= 1;
  const pct = Math.min(progress, 1);

  return (
    <TouchableOpacity
      style={[styles.card, isComplete && styles.cardComplete]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{challenge.rewardEmoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.name}>{challenge.name}</Text>
          <Text style={styles.desc}>
            {isComplete
              ? 'Challenge complete! Claim your reward 🎉'
              : daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                : 'Final day!'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {Math.round(pct * 100)}% complete
        </Text>
        {!isComplete && challenge.claimedAt == null && (
          <Text style={styles.rewardText}>
            🎁 {challenge.reward}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e8e0ff',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardComplete: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  desc: {
    fontSize: 13,
    color: '#666',
  },
  progressBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  rewardText: {
    fontSize: 12,
    color: '#6c63ff',
    fontWeight: '600',
  },
});
