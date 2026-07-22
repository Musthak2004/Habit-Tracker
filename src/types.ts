// ── Habit Types ──────────────────────────────────────────
export type HabitType = 'boolean' | 'volume';

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  targetCount: number;       // 1 for boolean, N for volume habits
  createdAt: string;          // ISO date
  completions: Record<string, number>;  // "YYYY-MM-DD" -> count (0 or 1 for boolean, 0-N for volume)
  archived: boolean;
  notificationTime?: string;  // "HH:mm" — per-habit reminder override
}

// ── Challenge Types ──────────────────────────────────────
export interface Challenge {
  id: string;
  habitId: string | null;     // null = general (track any habit)
  name: string;
  description: string;
  durationDays: number;
  startDate: string;          // ISO date
  endDate: string;            // ISO date
  requiredDaily: number;      // completions needed per day to count
  reward: string;
  rewardEmoji: string;
  completed: boolean;
  claimedAt: string | null;   // ISO date when reward was claimed
  isOnboarding: boolean;      // true for first-run 3-day challenge
}

// ── Log / History Types ──────────────────────────────────
export interface LogEntry {
  date: string;               // "YYYY-MM-DD"
  habitId: string;
  habitName: string;
  habitType: HabitType;
  count: number;
  targetCount: number;
}

// ── Streak Data (derived) ────────────────────────────────
export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

// ── Stats / Analytics (derived) ──────────────────────────
export interface HabitStats {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  thisWeek: number;          // completions this week
  thisMonth: number;         // completions this month
  consistency: number;       // percentage of days with at least 1 completion
  dailyBreakdown: {          // last 30 days
    date: string;
    count: number;
    target: number;
  }[];
}

// ── App Settings ─────────────────────────────────────────
export interface AppSettings {
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  notificationTime: string;  // "HH:mm" format
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

// ── AI Coaching / Nudge Types ──────────────────────────────
export type NudgeType = 'motivational' | 'suggestion' | 'insight';

export interface CoachingNudge {
  id: string;
  habitId: string | null;       // null = general habit tip / non-habit-specific
  message: string;
  type: NudgeType;
  contextData: {
    habitName?: string;
    currentStreak?: number;
    longestStreak?: number;
    consistency?: number;        // 0-100
    weeklyCount?: number;
    suggestion?: string;
  };
  createdAt: string;             // ISO date
  seen: boolean;
  dismissed: boolean;
}

// ── AI Reflection Types ────────────────────────────────────
export type PeriodType = 'weekly' | 'monthly';

export interface ReflectionReport {
  id: string;
  periodStart: string;           // ISO date
  periodEnd: string;             // ISO date
  periodType: PeriodType;
  summaryText: string;           // AI-generated human-readable summary
  reportData: {
    bestHabit: string | null;
    bestConsistency: number;
    worstHabit: string | null;
    worstConsistency: number;
    overallConsistency: number;
    topStreak: number;
    totalCompletions: number;
    habitSummaries: {
      name: string;
      consistency: number;
      streak: number;
      trend: 'up' | 'down' | 'stable';
      insight: string;
    }[];
    insights: string[];
    recommendations: string[];
  };
  createdAt: string;             // ISO date
}

// ── Coaching Settings (extends AppSettings) ──────────────
export interface CoachingSettings {
  coachingEnabled: boolean;
  reflectionWeekly: boolean;
  reflectionMonthly: boolean;
  lastNudgeDate: string | null;  // ISO date — to avoid nudging every session
  lastWeeklyReflection: string | null; // ISO date
  lastMonthlyReflection: string | null; // ISO date
  coachingNotificationEnabled: boolean;  // push to phone at coachingNotificationTime
  coachingNotificationTime: string;       // "HH:mm" — default "15:00"
}

export const DEFAULT_COACHING_SETTINGS: CoachingSettings = {
  coachingEnabled: true,
  reflectionWeekly: true,
  reflectionMonthly: true,
  lastNudgeDate: null,
  lastWeeklyReflection: null,
  lastMonthlyReflection: null,
  coachingNotificationEnabled: true,
  coachingNotificationTime: '15:00',
};

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingComplete: false,
  notificationsEnabled: true,
  notificationTime: '09:00',
  soundEnabled: true,
  hapticsEnabled: true,
};

// ── Storage Keys ─────────────────────────────────────────
export const STORAGE_KEYS = {
  HABITS: 'habit-tracker-habits-v2',
  CHALLENGES: 'habit-tracker-challenges',
  LOGS: 'habit-tracker-logs',
  SETTINGS: 'habit-tracker-settings',
  COACHING: 'habit-tracker-coaching-v2',
  REFLECTIONS: 'habit-tracker-reflections',
} as const;
