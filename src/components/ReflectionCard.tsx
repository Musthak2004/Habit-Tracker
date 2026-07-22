import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ReflectionReport } from '../types';

interface ReflectionCardProps {
  reflection: ReflectionReport;
  onGenerateNew?: () => void;
  loading?: boolean;
}

export default function ReflectionCard({
  reflection,
  onGenerateNew,
  loading,
}: ReflectionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { borderColor: '#d4d0ff' }]}>
        <View style={styles.skeletonHeader}>
          <Text style={styles.skeletonTitle}>📊 Generating report...</Text>
          <Text style={styles.skeletonSub}>Analyzing your habit data</Text>
        </View>
        <View style={styles.skeletonBody}>
          <Text style={styles.skeletonLine}>⏳ Crunching the numbers...</Text>
          <Text style={styles.skeletonLine}>💭 Finding insights...</Text>
        </View>
      </View>
    );
  }

  const periodLabel =
    reflection.periodType === 'weekly' ? 'Weekly Report' : 'Monthly Report';
  const periodEmoji = reflection.periodType === 'weekly' ? '📅' : '📆';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.periodEmoji}>{periodEmoji}</Text>
          <View style={styles.headerTextCol}>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <Text style={styles.periodDate}>
              {formatDate(reflection.periodStart)} — {formatDate(reflection.periodEnd)}
            </Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {/* Summary (always visible) */}
      <Text style={styles.summary}>{reflection.summaryText}</Text>

      {/* Quick stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{reflection.reportData.overallConsistency}%</Text>
          <Text style={styles.statLabel}>Consistency</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{reflection.reportData.topStreak}d</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{reflection.reportData.totalCompletions}</Text>
          <Text style={styles.statLabel}>Total Done</Text>
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.detail}>
          {/* Best / Worst habits */}
          {reflection.reportData.bestHabit && (
            <View style={styles.highlightRow}>
              <Text style={styles.highlightIcon}>🏆</Text>
              <Text style={styles.highlightText}>
                <Text style={styles.highlightBold}>Best: </Text>
                {reflection.reportData.bestHabit} — {reflection.reportData.bestConsistency}%
              </Text>
            </View>
          )}
          {reflection.reportData.worstHabit && (
            <View style={styles.highlightRow}>
              <Text style={styles.highlightIcon}>📈</Text>
              <Text style={styles.highlightText}>
                <Text style={styles.highlightBold}>Opportunity: </Text>
                {reflection.reportData.worstHabit} — {reflection.reportData.worstConsistency}%
              </Text>
            </View>
          )}

          {/* Habit summaries */}
          {reflection.reportData.habitSummaries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Per-Habit Breakdown</Text>
              {reflection.reportData.habitSummaries.map((h, i) => (
                <View key={i} style={styles.habitRow}>
                  <View style={styles.habitRowHeader}>
                    <Text style={styles.habitName}>{h.name}</Text>
                    <Text
                      style={[
                        styles.habitTrend,
                        h.trend === 'up'
                          ? { color: '#22c55e' }
                          : h.trend === 'down'
                          ? { color: '#ef4444' }
                          : { color: '#f59e0b' },
                      ]}
                    >
                      {h.trend === 'up' ? '↑' : h.trend === 'down' ? '↓' : '→'}
                    </Text>
                  </View>
                  <View style={styles.habitStatsBar}>
                    <View
                      style={[
                        styles.habitStatFill,
                        { width: `${h.consistency}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.habitStatLabel}>{h.consistency}% · {h.streak}d streak</Text>
                  <Text style={styles.habitInsight}>{h.insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Insights */}
          {reflection.reportData.insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Insights</Text>
              {reflection.reportData.insights.map((insight, i) => (
                <Text key={i} style={styles.bullet}>
                  • {insight}
                </Text>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {reflection.reportData.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Recommendations</Text>
              {reflection.reportData.recommendations.map((rec, i) => (
                <Text key={i} style={styles.bullet}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action */}
      {onGenerateNew && (
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={onGenerateNew}
          activeOpacity={0.7}
        >
          <Text style={styles.generateText}>🔄 Generate New Report</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextCol: {
    marginLeft: 8,
    flex: 1,
  },
  periodEmoji: {
    fontSize: 22,
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  periodDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
  },
  summary: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f7ff',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6c63ff',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    marginTop: 2,
  },
  detail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  highlightText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
  highlightBold: {
    fontWeight: '700',
    color: '#1a1a2e',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  habitRow: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  habitRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  habitTrend: {
    fontSize: 16,
    fontWeight: '700',
  },
  habitStatsBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  habitStatFill: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 3,
  },
  habitStatLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  habitInsight: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  bullet: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  },
  generateBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4d0ff',
  },
  generateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c63ff',
  },
  // ── Skeleton ─────────────────────────────────────────
  skeletonHeader: {
    marginBottom: 12,
  },
  skeletonTitle: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  skeletonSub: {
    fontSize: 13,
    color: '#bbb',
  },
  skeletonBody: {
    gap: 6,
  },
  skeletonLine: {
    fontSize: 13,
    color: '#bbb',
  },
});
