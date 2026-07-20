import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    emoji: '🎯',
    title: 'Build Better Habits',
    subtitle: 'Small daily actions lead to extraordinary results. Start your journey today.',
  },
  {
    emoji: '🔥',
    title: 'Track & Stay Consistent',
    subtitle: 'Simple one-tap tracking. Watch your streaks grow and stay motivated every day.',
  },
  {
    emoji: '🏆',
    title: 'Take the 3-Day Challenge',
    subtitle: 'Start with a 3-day challenge to prove to yourself that you can do it. Complete it and unlock a reward!',
  },
  {
    emoji: '📱',
    title: 'How It Works',
    subtitle: 'Create habits you want to track, mark them done each day, unlock rewards with milestones and kickstarts, view your progress in beautiful charts and history logs. Set reminders so you never miss a day! 💪',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    triggerHaptic('light');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleStart();
    }
  };

  const handleStart = () => {
    triggerHaptic('success');

    // Create onboarding challenge
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);
    const todayStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    dispatch({
      type: 'ADD_CHALLENGE',
      challenge: {
        id: 'onboarding-' + Date.now(),
        habitId: null,
        name: '3-Day Kickstart',
        description: 'Complete at least one habit every day for 3 days',
        durationDays: 3,
        startDate: todayStr,
        endDate: endStr,
        requiredDaily: 1,
        reward: 'Kickstarter badge + streak boost',
        rewardEmoji: '🏅',
        completed: false,
        claimedAt: null,
        isOnboarding: true,
      },
    });

    // Mark onboarding as complete
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { onboardingComplete: true },
    });

    onComplete();
  };

  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.center}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {step < STEPS.length - 1 ? (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleStart}
              >
                <Text style={styles.skipText}>Skip & start</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Text style={styles.startText}>🚀 Start My 3-Day Challenge!</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: {
    backgroundColor: '#6c63ff',
    width: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    padding: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  startBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  startText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
