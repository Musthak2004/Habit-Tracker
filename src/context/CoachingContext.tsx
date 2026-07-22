import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CoachingNudge,
  ReflectionReport,
  CoachingSettings,
  DEFAULT_COACHING_SETTINGS,
  STORAGE_KEYS,
} from '../types';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';
import { callAI, buildCoachingPrompt, buildReflectionPrompt, isAIConfigured } from '../lib/ai';
import {
  loadCoachingNudges,
  saveCoachingNudges,
  loadReflections,
  saveReflections,
} from '../storage';
import {
  syncCoachingNudgesToSupabase,
  syncCoachingNudgesFromSupabase,
  syncReflectionsToSupabase,
  syncReflectionsFromSupabase,
} from '../lib/sync';
import { scheduleCoachingNudgeNotification, cancelCoachingNotification } from '../utils/notifications';
import { uuid, getToday, mergeNudgesById } from '../lib/coaching-utils';

// ── State ────────────────────────────────────────────────────
interface CoachingState {
  nudges: CoachingNudge[];
  reflections: ReflectionReport[];
  settings: CoachingSettings;
  loading: boolean;         // initial load
  generating: boolean;      // currently generating AI content
  loaded: boolean;
}

const initialState: CoachingState = {
  nudges: [],
  reflections: [],
  settings: DEFAULT_COACHING_SETTINGS,
  loading: true,
  generating: false,
  loaded: false,
};

// ── Actions ──────────────────────────────────────────────────
type Action =
  | { type: 'LOAD_DATA'; nudges: CoachingNudge[]; reflections: ReflectionReport[]; settings: CoachingSettings }
  | { type: 'ADD_NUDGE'; nudge: CoachingNudge }
  | { type: 'MARK_NUDGE_SEEN'; id: string }
  | { type: 'DISMISS_NUDGE'; id: string }
  | { type: 'ADD_REFLECTION'; reflection: ReflectionReport }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<CoachingSettings> }
  | { type: 'SET_GENERATING'; generating: boolean };

function reducer(state: CoachingState, action: Action): CoachingState {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action, loaded: true, loading: false };

    case 'ADD_NUDGE':
      return { ...state, nudges: [action.nudge, ...state.nudges] };

    case 'MARK_NUDGE_SEEN':
      return {
        ...state,
        nudges: state.nudges.map((n) =>
          n.id === action.id ? { ...n, seen: true } : n
        ),
      };

    case 'DISMISS_NUDGE':
      return {
        ...state,
        nudges: state.nudges.map((n) =>
          n.id === action.id ? { ...n, dismissed: true } : n
        ),
      };

    case 'ADD_REFLECTION':
      return { ...state, reflections: [action.reflection, ...state.reflections] };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SET_GENERATING':
      return { ...state, generating: action.generating };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────
interface CoachingContextType {
  state: CoachingState;
  // Nudges
  activeNudge: CoachingNudge | null;
  generateNudge: () => Promise<boolean>;
  dismissNudge: (id: string) => void;
  getNudgesForHabit: (habitId: string) => CoachingNudge[];
  // Reflections
  generateReflection: (type: 'weekly' | 'monthly') => Promise<boolean>;
  latestWeeklyReflection: ReflectionReport | null;
  latestMonthlyReflection: ReflectionReport | null;
  // Utilities
  isAIConfigured: boolean;
  refreshCoachingData: () => Promise<void>;
  updateCoachingSettings: (settings: Partial<CoachingSettings>) => void;
  coachingDispatch: React.Dispatch<Action>;
}

const CoachingContext = createContext<CoachingContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────
export function CoachingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { state: appState, getHabitStats, getStreak } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNudgeGenerationRef = useRef<number>(0); // timestamp of last nudge generation
  const nudgeGenerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Rate limit refs for AI API calls (serverless proxy not yet available)
  const lastReflectionRef = useRef<Record<string, number>>({});
  const REFLECTION_RATE_LIMIT_MS = 60_000; // 1 minute between manual reflection generations
  const NUDGE_RATE_LIMIT_MS = 60_000;      // 1 minute between manual nudge generations

  // ── Load from AsyncStorage on mount ──────────────────────
  useEffect(() => {
    async function load() {
      const [nudges, reflections, savedSettings] = await Promise.all([
        loadCoachingNudges(),
        loadReflections(),
        AsyncStorage.getItem(STORAGE_KEYS.COACHING + '-settings').then(
          (s) => (s ? { ...DEFAULT_COACHING_SETTINGS, ...JSON.parse(s) } : DEFAULT_COACHING_SETTINGS)
        ),
      ]);

      dispatch({ type: 'LOAD_DATA', nudges, reflections, settings: savedSettings });
    }
    load();
  }, []);

  // ── Sync from Supabase after local load ──────────────────
  useEffect(() => {
    if (state.loaded && userId) {
      Promise.all([
        syncCoachingNudgesFromSupabase(userId),
        syncReflectionsFromSupabase(userId),
      ]).then(([remoteNudges, remoteReflections]) => {
        if (remoteNudges && remoteNudges.length > 0) {
          const merged = mergeNudgesById(state.nudges, remoteNudges);
          dispatch({ type: 'LOAD_DATA', nudges: merged, reflections: state.reflections, settings: state.settings });
        }
        if (remoteReflections && remoteReflections.length > 0) {
          const merged = mergeNudgesById(state.reflections, remoteReflections);
          dispatch({ type: 'LOAD_DATA', nudges: state.nudges, reflections: merged, settings: state.settings });
        }
      });
    }
  }, [state.loaded, userId]);

  // ── Persist to AsyncStorage on change (debounced) ────────
  useEffect(() => {
    if (!state.loaded) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      saveCoachingNudges(state.nudges);
      saveReflections(state.reflections);
      AsyncStorage.setItem(STORAGE_KEYS.COACHING + '-settings', JSON.stringify(state.settings));
    }, 500);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state.nudges, state.reflections, state.settings, state.loaded]);

  // ── Sync to Supabase on change (debounced) ───────────────
  useEffect(() => {
    if (!state.loaded || !userId) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncCoachingNudgesToSupabase(state.nudges, userId);
      syncReflectionsToSupabase(state.reflections, userId);
    }, 3000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [state.nudges, state.reflections, state.loaded, userId]);

  // ── AppState listener: auto-generate nudge on foreground ──
  useEffect(() => {
    if (!state.loaded) return;

    // Helper: try to generate a nudge, but only if enough time has passed
    // and there's no active undismissed nudge.
    const tryGenerate = () => {
      if (!state.settings.coachingEnabled || !isAIConfigured()) return;
      if (state.generating) return;

      // Don't spam: require at least 30 minutes since last generation
      const now = Date.now();
      const MIN_INTERVAL_MS = 30 * 60 * 1000;
      if (now - lastNudgeGenerationRef.current < MIN_INTERVAL_MS) return;

      // Only generate if there's no active undismissed nudge
      const hasActive = state.nudges.some((n) => !n.dismissed);
      if (hasActive) return;

      // Debounce: wait 2 seconds after foreground detection
      // (lets the app fully settle before making API calls)
      if (nudgeGenerationTimerRef.current) clearTimeout(nudgeGenerationTimerRef.current);
      nudgeGenerationTimerRef.current = setTimeout(() => {
        generateNudge().then((ok) => {
          if (ok) lastNudgeGenerationRef.current = Date.now();
        });
      }, 2000);
    };

    // Initial check on first load
    tryGenerate();

    // Listen for foreground transitions
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        tryGenerate();
      }
    });

    return () => {
      subscription.remove();
      if (nudgeGenerationTimerRef.current) clearTimeout(nudgeGenerationTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded, state.settings.coachingEnabled, state.nudges?.length]);

  // ── Active (undismissed) nudge, most recent first ─────────
  const activeNudge = useMemo(() => {
    return state.nudges.find((n) => !n.dismissed) ?? null;
  }, [state.nudges]);

  // ── Latest reflections ────────────────────────────────────
  const latestWeeklyReflection = useMemo(() => {
    return state.reflections.find((r) => r.periodType === 'weekly') ?? null;
  }, [state.reflections]);

  const latestMonthlyReflection = useMemo(() => {
    return state.reflections.find((r) => r.periodType === 'monthly') ?? null;
  }, [state.reflections]);

  // ── Generate a nudge from AI ──────────────────────────────
  const generateNudge = useCallback(async (): Promise<boolean> => {
    const activeHabits = appState.habits.filter((h) => !h.archived);
    if (activeHabits.length === 0 || !isAIConfigured()) return false;

    // Rate limit: at most once per minute
    const now = Date.now();
    if (now - lastNudgeGenerationRef.current < NUDGE_RATE_LIMIT_MS) {
      console.warn(`Rate limited: nudge generation — wait ${Math.ceil((NUDGE_RATE_LIMIT_MS - (now - lastNudgeGenerationRef.current)) / 1000)}s`);
      return false;
    }

    dispatch({ type: 'SET_GENERATING', generating: true });

    try {
      // Find the habits that need attention: low consistency or broken streak
      const scored = activeHabits.map((h) => {
        const stats = getHabitStats(h.id);
        const streak = getStreak(h.id);
        return {
          habit: h,
          stats,
          streak,
          // Score: lower consistency + longer streak elsewhere = nudge opp
          priorityScore: 100 - stats.consistency + (streak.current > 0 ? 0 : 20),
        };
      });

      // Pick the highest-priority habit (or the one with the longest streak for celebration)
      scored.sort((a, b) => b.priorityScore - a.priorityScore);
      const pick = scored.slice(0, 3); // Top 3 candidates

      // Call AI for each and pick the best
      let bestNudge: { message: string; habitName: string; habitId: string } | null = null;

      for (const candidate of pick) {
        const promptMessages = buildCoachingPrompt({
          name: candidate.habit.name,
          type: candidate.habit.type,
          currentStreak: candidate.streak.current,
          longestStreak: candidate.streak.longest,
          consistency: candidate.stats.consistency,
          weeklyCount: candidate.stats.thisWeek,
          targetCount: candidate.habit.targetCount,
        });

        const result = await callAI({
          system: `You are a supportive, insightful habit coach. Keep your response under 280 characters, be specific about the data, and if consistency is below 70%, suggest ONE concrete tiny action. Do not use em dashes (—). Use commas, colons, or periods instead. Return ONLY the message text.`,
          messages: promptMessages,
          temperature: 0.8,
          maxTokens: 200,
        });

        if (result.content && result.content.length > 0) {
          bestNudge = {
            message: result.content.trim(),
            habitName: candidate.habit.name,
            habitId: candidate.habit.id,
          };
          break; // Use the first successful response
        }
      }

      if (bestNudge) {
        const now = new Date().toISOString();
        const nudge: CoachingNudge = {
          id: uuid(),
          habitId: bestNudge.habitId,
          message: bestNudge.message,
          type: 'motivational',
          contextData: {
            habitName: bestNudge.habitName,
          },
          createdAt: now,
          seen: false,
          dismissed: false,
        };

        dispatch({ type: 'ADD_NUDGE', nudge });
        dispatch({ type: 'UPDATE_SETTINGS', settings: { lastNudgeDate: getToday() } });

        // Schedule a push notification if coaching notifications are enabled
        if (state.settings.coachingNotificationEnabled) {
          scheduleCoachingNudgeNotification(
            nudge.message,
            state.settings.coachingNotificationTime
          );
        }

        return true;
      }

      return false;
    } catch (e) {
      console.warn('Failed to generate nudge:', e);
      return false;
    } finally {
      dispatch({ type: 'SET_GENERATING', generating: false });
    }
  }, [appState.habits, getHabitStats, getStreak]);

  // ── Generate a reflection report from AI ─────────────────
  const generateReflection = useCallback(
    async (periodType: 'weekly' | 'monthly'): Promise<boolean> => {
      const activeHabits = appState.habits.filter((h) => !h.archived);
      if (activeHabits.length === 0 || !isAIConfigured()) return false;

      // Rate limit: at most once per minute per type
      const now = Date.now();
      const lastGen = lastReflectionRef.current[periodType] ?? 0;
      if (now - lastGen < REFLECTION_RATE_LIMIT_MS) {
        console.warn(`Rate limited: ${periodType} reflection generation — wait ${Math.ceil((REFLECTION_RATE_LIMIT_MS - (now - lastGen)) / 1000)}s`);
        return false;
      }
      lastReflectionRef.current[periodType] = now;

      dispatch({ type: 'SET_GENERATING', generating: true });

      try {
        // Build habit summaries for the AI
        const habitSummaries = activeHabits.map((h) => {
          const stats = getHabitStats(h.id);
          const streak = getStreak(h.id);
          const totalCompletions = Object.values(h.completions).reduce((s, c) => s + c, 0);
          return {
            name: h.name,
            streak: streak.current,
            consistency: stats.consistency,
            weeklyCount: stats.thisWeek,
            monthlyCount: stats.thisMonth,
            totalCompletions,
          };
        });

        const reflectionPrompt = buildReflectionPrompt(periodType, habitSummaries);

        const result = await callAI({
          system: reflectionPrompt.system,
          messages: reflectionPrompt.messages,
          temperature: 0.5,
          maxTokens: 2048,
        });

        if (!result.content) return false;

        // Parse the JSON response
        const parsed = JSON.parse(result.content);

        // Calculate period dates
        const now = new Date();
        const endDate = getToday();
        let startDate: string;

        if (periodType === 'weekly') {
          const monday = new Date(now);
          monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
          monday.setDate(monday.getDate() - 7); // Previous week
          startDate = monday.toISOString().split('T')[0];
        } else {
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          startDate = firstOfMonth.toISOString().split('T')[0];
        }

        const report: ReflectionReport = {
          id: uuid(),
          periodStart: startDate,
          periodEnd: endDate,
          periodType,
          summaryText: parsed.summary ?? 'No summary available.',
          reportData: {
            bestHabit: parsed.bestHabit ?? null,
            bestConsistency: parsed.bestConsistency ?? 0,
            worstHabit: parsed.worstHabit ?? null,
            worstConsistency: parsed.worstConsistency ?? 0,
            overallConsistency: parsed.overallConsistency ?? 0,
            topStreak: parsed.topStreak ?? 0,
            totalCompletions: parsed.totalCompletions ?? 0,
            habitSummaries: parsed.habitSummaries ?? [],
            insights: parsed.insights ?? [],
            recommendations: parsed.recommendations ?? [],
          },
          createdAt: new Date().toISOString(),
        };

        dispatch({ type: 'ADD_REFLECTION', reflection: report });

        // Update last reflection date
        const settingsUpdate: Partial<CoachingSettings> = {};
        if (periodType === 'weekly') settingsUpdate.lastWeeklyReflection = endDate;
        else settingsUpdate.lastMonthlyReflection = endDate;
        dispatch({ type: 'UPDATE_SETTINGS', settings: settingsUpdate });

        return true;
      } catch (e) {
        console.warn('Failed to generate reflection:', e);
        return false;
      } finally {
        dispatch({ type: 'SET_GENERATING', generating: false });
      }
    },
    [appState.habits, getHabitStats, getStreak]
  );

  // ── Dismiss a nudge ────────────────────────────────────────
  const dismissNudge = useCallback((id: string) => {
    dispatch({ type: 'MARK_NUDGE_SEEN', id });
    dispatch({ type: 'DISMISS_NUDGE', id });
  }, []);

  // ── Update coaching settings ────────────────────────────────
  const updateCoachingSettings = useCallback((settings: Partial<CoachingSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });

    // If coaching notifications were turned off, cancel any pending
    if ('coachingNotificationEnabled' in settings && !settings.coachingNotificationEnabled) {
      cancelCoachingNotification();
    }
  }, []);

  // ── Get nudges for a specific habit ────────────────────────
  const getNudgesForHabit = useCallback(
    (habitId: string): CoachingNudge[] => {
      return state.nudges.filter((n) => n.habitId === habitId);
    },
    [state.nudges]
  );

  // ── Refresh all coaching data from Supabase ───────────────
  const refreshCoachingData = useCallback(async () => {
    if (!userId) return;
    const [remoteNudges, remoteReflections] = await Promise.all([
      syncCoachingNudgesFromSupabase(userId),
      syncReflectionsFromSupabase(userId),
    ]);
    if (remoteNudges) {
      dispatch({ type: 'LOAD_DATA', nudges: remoteNudges, reflections: state.reflections, settings: state.settings });
    }
    if (remoteReflections) {
      dispatch({ type: 'LOAD_DATA', nudges: state.nudges, reflections: remoteReflections, settings: state.settings });
    }
  }, [userId, state.nudges, state.reflections, state.settings]);

  return (
    <CoachingContext.Provider
      value={{
        state,
        activeNudge,
        generateNudge,
        dismissNudge,
        getNudgesForHabit,
        generateReflection,
        latestWeeklyReflection,
        latestMonthlyReflection,
        isAIConfigured: isAIConfigured(),
        updateCoachingSettings,
        coachingDispatch: dispatch,
        refreshCoachingData,
      }}
    >
      {children}
    </CoachingContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useCoaching(): CoachingContextType {
  const ctx = useContext(CoachingContext);
  if (!ctx) throw new Error('useCoaching must be used within CoachingProvider');
  return ctx;
}
