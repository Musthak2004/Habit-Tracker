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
} as const;
