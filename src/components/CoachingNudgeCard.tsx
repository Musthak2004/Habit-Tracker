import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { CoachingNudge } from '../types';

interface CoachingNudgeCardProps {
  nudge?: CoachingNudge;
  onDismiss: (id: string) => void;
  onGenerateNew?: () => void;
  loading?: boolean;
}

const TYPE_META: Record<
  string,
  { icon: string; bg: string; border: string }
> = {
  motivational: { icon: '💪', bg: '#f0fdf4', border: '#bbf7d0' },
  suggestion: { icon: '💡', bg: '#fffbeb', border: '#fde68a' },
  insight: { icon: '🔍', bg: '#eff6ff', border: '#bfdbfe' },
};

export default function CoachingNudgeCard({
  nudge,
  onDismiss,
  onGenerateNew,
  loading,
}: CoachingNudgeCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const meta = nudge ? (TYPE_META[nudge.type] ?? TYPE_META.insight) : TYPE_META.insight;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (loading || !nudge) {
    return (
      <View style={[styles.container, { backgroundColor: '#f8f7ff', borderColor: '#d4d0ff' }]}>
        <View style={styles.skeletonRow}>
          <Text style={styles.skeletonIcon}>🤔</Text>
          <View style={styles.skeletonText}>
            <Text style={styles.skeletonLine1}>Thinking of something</Text>
            <Text style={styles.skeletonLine2}>motivational to say...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>{meta.icon}</Text>
        <View style={styles.content}>
          <Text style={styles.message}>{nudge.message}</Text>
          {nudge.contextData.habitName && (
            <Text style={styles.habitLabel}>
              About: {nudge.contextData.habitName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onDismiss(nudge.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>Got it!</Text>
        </TouchableOpacity>
        {onGenerateNew && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onGenerateNew}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshText}>🔄 New nudge</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 22,
    marginBottom: 4,
  },
  habitLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  dismissBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  // ── Skeleton loading ─────────────────────────────────
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
  },
  skeletonLine1: {
    fontSize: 15,
    color: '#999',
    marginBottom: 4,
  },
  skeletonLine2: {
    fontSize: 13,
    color: '#bbb',
  },
});
