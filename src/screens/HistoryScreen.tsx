import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useCoaching } from '../context/CoachingContext';
import StatsCard from '../components/StatsCard';
import CompletionChart from '../components/CompletionChart';
import ReflectionCard from '../components/ReflectionCard';

interface HistoryScreenProps {
  navigation: any;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { state, getHabitStats, getStreak } = useApp();
  const {
    state: coachingState,
    generateReflection,
    isAIConfigured,
  } = useCoaching();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const activeHabits = state.habits.filter((h) => !h.archived);

  const handleGenerateReflection = useCallback(
    (type: 'weekly' | 'monthly') => {
      if (!isAIConfigured) {
        Alert.alert(
          'AI Not Configured',
          'Set EXPO_PUBLIC_AI_API_KEY in your .env to enable AI-powered reflections.'
        );
        return;
      }
      generateReflection(type);
    },
    [isAIConfigured, generateReflection]
  );

  // Overall stats
  const allStreaks = activeHabits.map((h) => getStreak(h.id));
  const bestStreak = Math.max(...allStreaks.map((s) => s.longest), 0);
  const totalCompletionsAll = activeHabits.reduce(
    (sum, h) =>
      sum + Object.values(h.completions).reduce((s, c) => s + c, 0),
    0
  );

  // Selected habit stats
  const selectedHabit = selectedHabitId
    ? activeHabits.find((h) => h.id === selectedHabitId)
    : null;
  const stats = selectedHabitId
    ? getHabitStats(selectedHabitId)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 History</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overall stats */}
        <StatsCard
          title="Overall Stats"
          stats={[
            { label: 'Active Habits', value: activeHabits.length, icon: '📋' },
            { label: 'Best Streak', value: `${bestStreak}d`, icon: '🔥', color: '#f59e0b' },
            { label: 'Completions', value: totalCompletionsAll, icon: '✅' },
          ]}
        />

        {/* Habit selector */}
        <Text style={styles.sectionTitle}>Select a Habit</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.habitSelector}
        >
          <TouchableOpacity
            style={[
              styles.habitChip,
              selectedHabitId === null && styles.habitChipActive,
            ]}
            onPress={() => {
              setSelectedHabitId(null);
            }}
          >
            <Text
              style={[
                styles.habitChipText,
                selectedHabitId === null && styles.habitChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {activeHabits.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[
                styles.habitChip,
                selectedHabitId === h.id && styles.habitChipActive,
              ]}
              onPress={() => setSelectedHabitId(h.id)}
            >
              <Text
                style={[
                  styles.habitChipText,
                  selectedHabitId === h.id && styles.habitChipTextActive,
                ]}
              >
                {h.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart */}
        {stats ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              30-Day Breakdown: {selectedHabit?.name}
            </Text>
            <CompletionChart data={stats.dailyBreakdown} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>All Habits — 30 Day View</Text>
            {activeHabits.map((h) => {
              const s = getHabitStats(h.id);
              return (
                <View key={h.id} style={styles.habitBreakdown}>
                  <Text style={styles.habitBreakdownName}>{h.name}</Text>
                  <CompletionChart data={s.dailyBreakdown} height={60} />
                </View>
              );
            })}
          </View>
        )}

        {/* Detailed stats */}
        {stats && (
          <StatsCard
            title={`${selectedHabit?.name} — Details`}
            stats={[
              {
                label: 'This Week',
                value: stats.thisWeek,
                icon: '📅',
              },
              {
                label: 'This Month',
                value: stats.thisMonth,
                icon: '📆',
              },
              {
                label: 'Consistency',
                value: `${stats.consistency}%`,
                icon: '🎯',
                color: stats.consistency > 70 ? '#22c55e' : '#f59e0b',
              },
              {
                label: 'Current Streak',
                value: `${stats.currentStreak}d`,
                icon: '🔥',
                color: '#f59e0b',
              },
              {
                label: 'Longest Streak',
                value: `${stats.longestStreak}d`,
                icon: '🏆',
                color: '#6c63ff',
              },
              {
                label: 'Total',
                value: stats.totalCompletions,
                icon: '✅',
              },
            ]}
          />
        )}

        {/* Recent activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {activeHabits.length === 0 ? (
            <Text style={styles.emptyText}>No habits yet</Text>
          ) : (
            [...Array(7)]
              .map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
              })
              .map((dateStr) => {
                const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString(
                  'en-US',
                  { weekday: 'short', month: 'short', day: 'numeric' }
                );
                const isToday =
                  dateStr === new Date().toISOString().split('T')[0];
                const doneHabits = activeHabits.filter((h) => {
                  const count = h.completions[dateStr] ?? 0;
                  return count >= h.targetCount;
                });

                return (
                  <View key={dateStr} style={styles.logRow}>
                    <Text
                      style={[styles.logDate, isToday && styles.logDateToday]}
                    >
                      {isToday ? 'Today' : dateLabel}
                    </Text>
                    <Text style={styles.logCount}>
                      {doneHabits.length}/{activeHabits.length} done
                    </Text>
                    <View style={styles.logDots}>
                      {activeHabits.map((h) => {
                        const count = h.completions[dateStr] ?? 0;
                        const done = count >= h.targetCount;
                        return (
                          <View
                            key={h.id}
                            style={[
                              styles.logDot,
                              done ? styles.logDotDone : styles.logDotMissed,
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {/* AI Reflection Reports */}
        <Text style={styles.sectionTitle}>🤖 AI Reflections</Text>

        {/* Weekly reflection */}
        {coachingState.reflections.filter((r) => r.periodType === 'weekly').length > 0 ? (
          <ReflectionCard
            reflection={
              coachingState.reflections.filter((r) => r.periodType === 'weekly')[0]
            }
            onGenerateNew={() => handleGenerateReflection('weekly')}
            loading={
              coachingState.generating &&
              !coachingState.reflections.some((r) => r.periodType === 'weekly')
            }
          />
        ) : (
          <TouchableOpacity
            style={styles.generateCard}
            onPress={() => handleGenerateReflection('weekly')}
            activeOpacity={0.7}
          >
            <Text style={styles.generateCardEmoji}>📅</Text>
            <Text style={styles.generateCardTitle}>Generate Weekly Report</Text>
            <Text style={styles.generateCardDesc}>
              AI-powered analysis of your week's habit performance
            </Text>
            {coachingState.generating && (
              <Text style={styles.generatingText}>Generating...</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Monthly reflection */}
        {coachingState.reflections.filter((r) => r.periodType === 'monthly').length > 0 ? (
          <ReflectionCard
            reflection={
              coachingState.reflections.filter((r) => r.periodType === 'monthly')[0]
            }
            onGenerateNew={() => handleGenerateReflection('monthly')}
            loading={
              coachingState.generating &&
              !coachingState.reflections.some((r) => r.periodType === 'monthly')
            }
          />
        ) : (
          <TouchableOpacity
            style={styles.generateCard}
            onPress={() => handleGenerateReflection('monthly')}
            activeOpacity={0.7}
          >
            <Text style={styles.generateCardEmoji}>📆</Text>
            <Text style={styles.generateCardTitle}>Generate Monthly Report</Text>
            <Text style={styles.generateCardDesc}>
              Deep analysis of your monthly habit trends
            </Text>
            {coachingState.generating && (
              <Text style={styles.generatingText}>Generating...</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff',
  },
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  closeText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '500',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  habitSelector: {
    marginBottom: 16,
  },
  habitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  habitChipActive: {
    borderColor: '#6c63ff',
    backgroundColor: '#f8f7ff',
  },
  habitChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  habitChipTextActive: {
    color: '#6c63ff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  habitBreakdown: {
    marginBottom: 16,
  },
  habitBreakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logDate: {
    fontSize: 13,
    color: '#555',
    width: 90,
  },
  logDateToday: {
    fontWeight: '700',
    color: '#6c63ff',
  },
  logCount: {
    fontSize: 12,
    color: '#666',
    width: 65,
    textAlign: 'right',
    marginRight: 8,
  },
  logDots: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    flexWrap: 'nowrap',
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logDotDone: {
    backgroundColor: '#22c55e',
  },
  logDotMissed: {
    backgroundColor: '#fee2e2',
  },
  generateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4d0ff',
    borderStyle: 'dashed',
  },
  generateCardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  generateCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6c63ff',
    marginBottom: 4,
  },
  generateCardDesc: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  generatingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 8,
  },
});
