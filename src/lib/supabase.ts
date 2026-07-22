import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Habit, Challenge, AppSettings, CoachingNudge, ReflectionReport } from '../types';
import { ENV } from './env';

// These are filled in by the user after creating a Supabase project.
// See: Creating a Supabase Project step in the README or supabase-schema.ts
const SUPABASE_URL = ENV.supabaseUrl;
const SUPABASE_ANON_KEY = ENV.supabaseAnonKey;

// ── AsyncStorage adapter for Supabase auth ────────────────────
// Supabase expects { getItem, setItem, removeItem } — AsyncStorage
// matches this shape, but uses string keys and returns string | null.
const AsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to persist auth token', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove auth token', e);
    }
  },
};

// ── Typed Supabase client ─────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed in React Native
  },
});

// ── Database row types (mirror app types) ─────────────────────
export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  type: 'boolean' | 'volume';
  target_count: number;
  created_at: string;
  completions: Record<string, number>;
  archived: boolean;
  notification_time: string | null;
}

export interface ChallengeRow {
  id: string;
  user_id: string;
  habit_id: string | null;
  name: string;
  description: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  required_daily: number;
  reward: string;
  reward_emoji: string;
  completed: boolean;
  claimed_at: string | null;
  is_onboarding: boolean;
}

export interface SettingsRow {
  user_id: string;
  onboarding_complete: boolean;
  notifications_enabled: boolean;
  notification_time: string;
  sound_enabled: boolean;
  haptics_enabled: boolean;
}

// ── Convert between app types and DB row types ────────────────
export function habitToRow(habit: Habit, userId: string): HabitRow {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    type: habit.type,
    target_count: habit.targetCount,
    created_at: habit.createdAt,
    completions: habit.completions,
    archived: habit.archived,
    notification_time: habit.notificationTime ?? null,
  };
}

export function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    targetCount: row.target_count,
    createdAt: row.created_at,
    completions: row.completions,
    archived: row.archived,
    notificationTime: row.notification_time ?? undefined,
  };
}

export function challengeToRow(
  challenge: Challenge,
  userId: string
): ChallengeRow {
  return {
    id: challenge.id,
    user_id: userId,
    habit_id: challenge.habitId,
    name: challenge.name,
    description: challenge.description,
    duration_days: challenge.durationDays,
    start_date: challenge.startDate,
    end_date: challenge.endDate,
    required_daily: challenge.requiredDaily,
    reward: challenge.reward,
    reward_emoji: challenge.rewardEmoji,
    completed: challenge.completed,
    claimed_at: challenge.claimedAt,
    is_onboarding: challenge.isOnboarding,
  };
}

export function rowToChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    habitId: row.habit_id,
    name: row.name,
    description: row.description,
    durationDays: row.duration_days,
    startDate: row.start_date,
    endDate: row.end_date,
    requiredDaily: row.required_daily,
    reward: row.reward,
    rewardEmoji: row.reward_emoji,
    completed: row.completed,
    claimedAt: row.claimed_at,
    isOnboarding: row.is_onboarding,
  };
}

export function settingsToRow(
  settings: AppSettings,
  userId: string
): SettingsRow {
  return {
    user_id: userId,
    onboarding_complete: settings.onboardingComplete,
    notifications_enabled: settings.notificationsEnabled,
    notification_time: settings.notificationTime,
    sound_enabled: settings.soundEnabled,
    haptics_enabled: settings.hapticsEnabled,
  };
}

export function rowToSettings(row: SettingsRow): AppSettings {
  return {
    onboardingComplete: row.onboarding_complete,
    notificationsEnabled: row.notifications_enabled,
    notificationTime: row.notification_time,
    soundEnabled: row.sound_enabled,
    hapticsEnabled: row.haptics_enabled,
  };
}

// ── Coaching Nudge row types & converters ─────────────────
export interface CoachingNudgeRow {
  id: string;
  user_id: string;
  habit_id: string | null;
  message: string;
  type: 'motivational' | 'suggestion' | 'insight';
  context_data: Record<string, any>;
  created_at: string;
  seen: boolean;
  dismissed: boolean;
}

export function coachingNudgeToRow(nudge: CoachingNudge, userId: string): CoachingNudgeRow {
  return {
    id: nudge.id,
    user_id: userId,
    habit_id: nudge.habitId,
    message: nudge.message,
    type: nudge.type,
    context_data: nudge.contextData,
    created_at: nudge.createdAt,
    seen: nudge.seen,
    dismissed: nudge.dismissed,
  };
}

export function rowToCoachingNudge(row: CoachingNudgeRow): CoachingNudge {
  return {
    id: row.id,
    habitId: row.habit_id,
    message: row.message,
    type: row.type,
    contextData: row.context_data,
    createdAt: row.created_at,
    seen: row.seen,
    dismissed: row.dismissed,
  };
}

// ── Reflection Report row types & converters ─────────────
export interface ReflectionReportRow {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  period_type: 'weekly' | 'monthly';
  summary_text: string;
  report_data: ReflectionReport['reportData'];
  created_at: string;
}

export function reflectionToRow(report: ReflectionReport, userId: string): ReflectionReportRow {
  return {
    id: report.id,
    user_id: userId,
    period_start: report.periodStart,
    period_end: report.periodEnd,
    period_type: report.periodType,
    summary_text: report.summaryText,
    report_data: report.reportData,
    created_at: report.createdAt,
  };
}

export function rowToReflection(row: ReflectionReportRow): ReflectionReport {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    periodType: row.period_type,
    summaryText: row.summary_text,
    reportData: row.report_data,
    createdAt: row.created_at,
  };
}
