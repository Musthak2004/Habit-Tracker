import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import {
  Habit,
  Challenge,
  AppSettings,
  DEFAULT_SETTINGS,
  HabitStats,
  StreakInfo,
} from '../types';
import {
  loadHabits,
  saveHabits,
  loadChallenges,
  saveChallenges,
  loadSettings,
  saveSettings,
} from '../storage';
import { useAuth } from './AuthContext';
import {
  fullSync,
  syncHabitsToSupabase,
  syncChallengesToSupabase,
  syncSettingsToSupabase,
  deleteAllUserData,
} from '../lib/sync';

// ── State ────────────────────────────────────────────────
interface AppState {
  habits: Habit[];
  challenges: Challenge[];
  settings: AppSettings;
  loaded: boolean;
  isSyncing: boolean;
}

const initialState: AppState = {
  habits: [],
  challenges: [],
  settings: DEFAULT_SETTINGS,
  loaded: false,
  isSyncing: false,
};

// ── Actions ──────────────────────────────────────────────
type Action =
  | { type: 'LOAD_DATA'; habits: Habit[]; challenges: Challenge[]; settings: AppSettings }
  | { type: 'ADD_HABIT'; habit: Habit }
  | { type: 'UPDATE_HABIT'; habit: Habit }
  | { type: 'DELETE_HABIT'; id: string }
  | { type: 'TOGGLE_HABIT'; id: string; date: string }
  | { type: 'INCREMENT_HABIT'; id: string; date: string; maxCount: number }
  | { type: 'SET_COMPLETION'; id: string; date: string; count: number }
  | { type: 'ARCHIVE_HABIT'; id: string }
  | { type: 'ADD_CHALLENGE'; challenge: Challenge }
  | { type: 'COMPLETE_CHALLENGE'; id: string }
  | { type: 'CLAIM_REWARD'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_SYNCING'; syncing: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action, loaded: true };

    case 'ADD_HABIT':
      return { ...state, habits: [action.habit, ...state.habits] };

    case 'UPDATE_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.habit.id ? action.habit : h)),
      };

    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) };

    case 'TOGGLE_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h;
          const completions = { ...h.completions };
          if (completions[action.date]) {
            delete completions[action.date];
          } else {
            completions[action.date] = 1;
          }
          return { ...h, completions };
        }),
      };

    case 'INCREMENT_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h;
          const current = h.completions[action.date] ?? 0;
          const next = Math.min(current + 1, action.maxCount);
          return {
            ...h,
            completions: { ...h.completions, [action.date]: next },
          };
        }),
      };

    case 'SET_COMPLETION':
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h;
          return {
            ...h,
            completions: { ...h.completions, [action.date]: action.count },
          };
        }),
      };

    case 'ARCHIVE_HABIT':
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.id ? { ...h, archived: true } : h
        ),
      };

    case 'ADD_CHALLENGE':
      return { ...state, challenges: [...state.challenges, action.challenge] };

    case 'COMPLETE_CHALLENGE':
      return {
        ...state,
        challenges: state.challenges.map((c) =>
          c.id === action.id ? { ...c, completed: true } : c
        ),
      };

    case 'CLAIM_REWARD':
      return {
        ...state,
        challenges: state.challenges.map((c) =>
          c.id === action.id ? { ...c, claimedAt: new Date().toISOString() } : c
        ),
      };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'CLEAR_ALL':
      // Note: Supabase deletion is handled in the effect below
      return { ...initialState, loaded: true };

    case 'SET_SYNCING':
      return { ...state, isSyncing: action.syncing };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  triggerSync: () => void;   // Manual sync trigger
  // Derived helpers
  getHabitStats: (habitId: string) => HabitStats;
  getStreak: (habitId: string) => StreakInfo;
  getTodayCompletions: () => { habit: Habit; done: boolean; count: number }[];
  getActiveChallenges: () => Challenge[];
  getTodayProgress: () => { done: number; total: number };
}

const AppContext = createContext<AppContextType | null>(null);

// ── Date helpers ─────────────────────────────────────────
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.floor((da - db) / (1000 * 60 * 60 * 24));
}

function calcStreak(completions: Record<string, number>): StreakInfo {
  const dates = Object.keys(completions)
    .filter((d) => completions[d] > 0)
    .sort()
    .reverse();

  if (dates.length === 0) return { current: 0, longest: 0, lastActiveDate: null };

  const today = getToday();
  const mostRecent = dates[0];
  const diff = daysBetween(today, mostRecent);

  // Current streak
  let current = 0;
  if (diff <= 1) {
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (diff === 1) expected.setDate(expected.getDate() - 1); // started yesterday
      const expectedStr = expected.toISOString().split('T')[0];
      if (dates[i] === expectedStr) current++;
      else break;
    }
  }

  // Longest streak
  let longest = 0;
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (i === dates.length - 1) {
      streak = 1;
    } else {
      const prev = new Date(dates[i + 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diffDays = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) streak++;
      else streak = 1;
    }
    longest = Math.max(longest, streak);
  }

  return { current, longest, lastActiveDate: mostRecent };
}

// ── Provider ─────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const needsSyncRef = useRef(false);

  // Wrapped dispatch to detect CLEAR_ALL and trigger remote deletion
  const dispatch = useCallback(
    (action: Action) => {
      if (action.type === 'CLEAR_ALL' && userId) {
        deleteAllUserData(userId);
      }
      baseDispatch(action);
    },
    [userId]
  );

  // Load data on mount
  useEffect(() => {
    Promise.all([loadHabits(), loadChallenges(), loadSettings()]).then(
      ([habits, challenges, settings]) => {
        dispatch({ type: 'LOAD_DATA', habits, challenges, settings });
      }
    );
  }, []);

  // Full sync from Supabase after local data loads (only when authenticated)
  useEffect(() => {
    if (state.loaded && userId) {
      fullSync(userId).then((result) => {
        if (result) {
          dispatch({
            type: 'LOAD_DATA',
            habits: result.habits,
            challenges: result.challenges,
            settings: result.settings,
          });
        }
        dispatch({ type: 'SET_SYNCING', syncing: false } as any);
      });
    }
  }, [state.loaded, userId]);

  // Persist on change (debounced)
  useEffect(() => {
    if (!state.loaded) return;
    const timeout = setTimeout(() => {
      saveHabits(state.habits);
      saveChallenges(state.challenges);
      saveSettings(state.settings);
    }, 300);
    return () => clearTimeout(timeout);
  }, [state.habits, state.challenges, state.settings, state.loaded]);

  // Sync to Supabase on mutations (debounced)
  useEffect(() => {
    if (!state.loaded || !userId) return;
    // Mark that a sync is needed
    needsSyncRef.current = true;

    // Debounce sync: wait for user to stop mutating
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (!needsSyncRef.current) return;
      needsSyncRef.current = false;

      dispatch({ type: 'SET_SYNCING', syncing: true } as any);

      Promise.all([
        syncHabitsToSupabase(state.habits, userId),
        syncChallengesToSupabase(state.challenges, userId),
        syncSettingsToSupabase(state.settings, userId),
      ]).finally(() => {
        dispatch({ type: 'SET_SYNCING', syncing: false } as any);
      });
    }, 2000); // 2s debounce — mutations often come in bursts

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [state.habits, state.challenges, state.settings, state.loaded, userId]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (!userId) return;
    dispatch({ type: 'SET_SYNCING', syncing: true } as any);
    Promise.all([
      syncHabitsToSupabase(state.habits, userId),
      syncChallengesToSupabase(state.challenges, userId),
      syncSettingsToSupabase(state.settings, userId),
    ]).finally(() => {
      dispatch({ type: 'SET_SYNCING', syncing: false } as any);
    });
  }, [state.habits, state.challenges, state.settings, userId]);

  const getHabitStats = useCallback(
    (habitId: string): HabitStats => {
      const habit = state.habits.find((h) => h.id === habitId);
      if (!habit) {
        return {
          totalCompletions: 0,
          currentStreak: 0,
          longestStreak: 0,
          thisWeek: 0,
          thisMonth: 0,
          consistency: 0,
          dailyBreakdown: [],
        };
      }

      const streak = calcStreak(habit.completions);
      const today = new Date();
      const todayStr = getToday();

      // Calculate days since habit creation (capped at 30 for display)
      const created = new Date(habit.createdAt);
      const daysSinceCreation = Math.max(1, Math.floor((today.getTime() - created.getTime()) / 86400000) + 1);
      const lookbackDays = Math.min(daysSinceCreation, 30);

      // Last N days breakdown (N = lookbackDays)
      const dailyBreakdown: { date: string; count: number; target: number }[] = [];
      let thisWeek = 0;
      let thisMonth = 0;
      let daysWithCompletion = 0;
      let daysTracked = 0;

      // Get today's day of week for this-week filter
      const sundayThisWeek = new Date(today);
      sundayThisWeek.setDate(today.getDate() - today.getDay());
      const saturdayThisWeek = new Date(sundayThisWeek);
      saturdayThisWeek.setDate(sundayThisWeek.getDate() + 6);

      for (let i = lookbackDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = habit.completions[dateStr] ?? 0;
        dailyBreakdown.push({
          date: dateStr,
          count,
          target: habit.targetCount,
        });

        if (count > 0) daysWithCompletion++;
        daysTracked++;

        // This week (Monday-Sunday)
        if (d >= sundayThisWeek && d <= saturdayThisWeek) {
          thisWeek += count;
        }

        // This month
        if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
          thisMonth += count;
        }
      }

      const totalCompletions = Object.values(habit.completions).reduce(
        (sum, c) => sum + c,
        0
      );

      return {
        totalCompletions,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        thisWeek,
        thisMonth,
        consistency: daysTracked > 0 ? Math.round((daysWithCompletion / daysTracked) * 100) : 0,
        dailyBreakdown,
      };
    },
    [state.habits]
  );

  const getStreak = useCallback(
    (habitId: string): StreakInfo => {
      const habit = state.habits.find((h) => h.id === habitId);
      if (!habit) return { current: 0, longest: 0, lastActiveDate: null };
      return calcStreak(habit.completions);
    },
    [state.habits]
  );

  const getTodayCompletions = useCallback(() => {
    const today = getToday();
    return state.habits
      .filter((h) => !h.archived)
      .map((habit) => {
        const count = habit.completions[today] ?? 0;
        return {
          habit,
          done: count >= habit.targetCount,
          count,
        };
      });
  }, [state.habits]);

  const getActiveChallenges = useCallback(() => {
    const now = new Date().toISOString();
    return state.challenges.filter(
      (c) => !c.claimedAt && c.endDate >= now
    );
  }, [state.challenges]);

  const getTodayProgress = useCallback(() => {
    const today = getToday();
    const active = state.habits.filter((h) => !h.archived);
    let done = 0;
    for (const h of active) {
      const count = h.completions[today] ?? 0;
      if (count >= h.targetCount) done++;
    }
    return { done, total: active.length };
  }, [state.habits]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        triggerSync,
        getHabitStats,
        getStreak,
        getTodayCompletions,
        getActiveChallenges,
        getTodayProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
