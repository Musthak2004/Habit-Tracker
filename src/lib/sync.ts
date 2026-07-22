import { supabase } from './supabase';
import {
  habitToRow,
  rowToHabit,
  challengeToRow,
  rowToChallenge,
  settingsToRow,
  rowToSettings,
  coachingNudgeToRow,
  rowToCoachingNudge,
  reflectionToRow,
  rowToReflection,
} from './supabase';
import { loadHabits, loadChallenges, loadSettings } from '../storage';
import { saveHabits, saveChallenges, saveSettings } from '../storage';
import type { Habit, Challenge, AppSettings, CoachingNudge, ReflectionReport } from '../types';

// ── Sync Result ────────────────────────────────────────────
export interface SyncResult {
  habits: Habit[];
  challenges: Challenge[];
  settings: AppSettings;
}

// ── Habits ─────────────────────────────────────────────────
export async function syncHabitsToSupabase(
  habits: Habit[],
  userId: string
): Promise<void> {
  if (!userId) return;
  const rows = habits.map((h) => habitToRow(h, userId));

  try {
    const { error } = await supabase.from('habits').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('sync: habits upsert error:', error.message);
    }
  } catch (e: any) {
    console.warn('sync: habits upsert exception:', e?.message ?? e);
  }
}

export async function syncHabitsFromSupabase(
  userId: string
): Promise<Habit[] | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('sync: habits fetch error:', error.message);
      return null;
    }

    return (data ?? []).map(rowToHabit);
  } catch (e: any) {
    console.warn('sync: habits fetch exception:', e?.message ?? e);
    return null;
  }
}

// ── Challenges ─────────────────────────────────────────────
export async function syncChallengesToSupabase(
  challenges: Challenge[],
  userId: string
): Promise<void> {
  if (!userId) return;
  const rows = challenges.map((c) => challengeToRow(c, userId));

  try {
    const { error } = await supabase.from('challenges').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('sync: challenges upsert error:', error.message);
    }
  } catch (e: any) {
    console.warn('sync: challenges upsert exception:', e?.message ?? e);
  }
}

export async function syncChallengesFromSupabase(
  userId: string
): Promise<Challenge[] | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('sync: challenges fetch error:', error.message);
      return null;
    }

    return (data ?? []).map(rowToChallenge);
  } catch (e: any) {
    console.warn('sync: challenges fetch exception:', e?.message ?? e);
    return null;
  }
}

// ── Settings ───────────────────────────────────────────────
export async function syncSettingsToSupabase(
  settings: AppSettings,
  userId: string
): Promise<void> {
  if (!userId) return;
  const row = settingsToRow(settings, userId);

  try {
    const { error } = await supabase.from('settings').upsert(row, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('sync: settings upsert error:', error.message);
    }
  } catch (e: any) {
    console.warn('sync: settings upsert exception:', e?.message ?? e);
  }
}

export async function syncSettingsFromSupabase(
  userId: string
): Promise<AppSettings | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows found — first time user, no settings yet
      if (error.code !== 'PGRST116') {
        console.warn('sync: settings fetch error:', error.message);
      }
      return null;
    }

    return rowToSettings(data);
  } catch (e: any) {
    console.warn('sync: settings fetch exception:', e?.message ?? e);
    return null;
  }
}

// ── Delete all data for the current user (on sign-out or clear-all) ──
export async function deleteAllUserData(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await Promise.all([
      supabase.from('habits').delete().eq('user_id', userId),
      supabase.from('challenges').delete().eq('user_id', userId),
      supabase.from('settings').delete().eq('user_id', userId),
      supabase.from('coaching_nudges').delete().eq('user_id', userId),
      supabase.from('reflection_reports').delete().eq('user_id', userId),
    ]);
  } catch (e: any) {
    console.warn('sync: deleteAll error:', e?.message ?? e);
  }
}

// ── Full Sync (pull from Supabase, merge into local cache) ──
//
// Strategy: "Supabase wins" — remote data overwrites local.
// Local-only data (e.g., guest habits before sign-up) gets uploaded.
//
// Returns the merged result so the app can update its state.
export async function fullSync(userId: string): Promise<SyncResult | null> {
  if (!userId) return null;

  // Fetch remote data
  const [remoteHabits, remoteChallenges, remoteSettings] = await Promise.all([
    syncHabitsFromSupabase(userId),
    syncChallengesFromSupabase(userId),
    syncSettingsFromSupabase(userId),
  ]);

  // Load local data
  const localHabits = await loadHabits();
  const localChallenges = await loadChallenges();
  const localSettings = await loadSettings();

  // Merge: remote data wins (if it exists), otherwise keep local
  let mergedHabits: Habit[];
  let mergedChallenges: Challenge[];
  let mergedSettings: AppSettings;

  if (remoteHabits && remoteHabits.length > 0) {
    mergedHabits = mergeHabits(localHabits, remoteHabits);
  } else {
    // No remote data — upload local data
    mergedHabits = localHabits;
    if (localHabits.length > 0) {
      syncHabitsToSupabase(localHabits, userId);
    }
  }

  if (remoteChallenges && remoteChallenges.length > 0) {
    mergedChallenges = mergeChallenges(localChallenges, remoteChallenges);
  } else {
    mergedChallenges = localChallenges;
    if (localChallenges.length > 0) {
      syncChallengesToSupabase(localChallenges, userId);
    }
  }

  if (remoteSettings) {
    mergedSettings = remoteSettings;
  } else {
    mergedSettings = localSettings;
    syncSettingsToSupabase(localSettings, userId);
  }

  // Write merged result to local cache
  await Promise.all([
    saveHabits(mergedHabits),
    saveChallenges(mergedChallenges),
    saveSettings(mergedSettings),
  ]);

  return { habits: mergedHabits, challenges: mergedChallenges, settings: mergedSettings };
}

// ── Merge helpers ──────────────────────────────────────────
// Remote wins in conflicts. Local-only items are preserved.

function mergeHabits(local: Habit[], remote: Habit[]): Habit[] {
  const remoteMap = new Map<string, Habit>();
  for (const h of remote) remoteMap.set(h.id, h);

  // Start with remote, then add any local habits not in remote
  const merged = new Map(remoteMap);
  for (const h of local) {
    if (!merged.has(h.id)) {
      merged.set(h.id, h);
    }
  }

  return Array.from(merged.values());
}

function mergeChallenges(local: Challenge[], remote: Challenge[]): Challenge[] {
  const remoteMap = new Map<string, Challenge>();
  for (const c of remote) remoteMap.set(c.id, c);

  const merged = new Map(remoteMap);
  for (const c of local) {
    if (!merged.has(c.id)) {
      merged.set(c.id, c);
    }
  }

  return Array.from(merged.values());
}

// ── Coaching Nudges ─────────────────────────────────────────
export async function syncCoachingNudgesToSupabase(
  nudges: CoachingNudge[],
  userId: string
): Promise<void> {
  if (!userId) return;
  const rows = nudges.map((n) => coachingNudgeToRow(n, userId));

  try {
    const { error } = await supabase.from('coaching_nudges').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('sync: nudges upsert error:', error.message);
    }
  } catch (e: any) {
    console.warn('sync: nudges upsert exception:', e?.message ?? e);
  }
}

export async function syncCoachingNudgesFromSupabase(
  userId: string
): Promise<CoachingNudge[] | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('coaching_nudges')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('sync: nudges fetch error:', error.message);
      return null;
    }

    return (data ?? []).map(rowToCoachingNudge);
  } catch (e: any) {
    console.warn('sync: nudges fetch exception:', e?.message ?? e);
    return null;
  }
}

// ── Reflections ──────────────────────────────────────────────
export async function syncReflectionsToSupabase(
  reflections: ReflectionReport[],
  userId: string
): Promise<void> {
  if (!userId) return;
  const rows = reflections.map((r) => reflectionToRow(r, userId));

  try {
    const { error } = await supabase.from('reflection_reports').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.warn('sync: reflections upsert error:', error.message);
    }
  } catch (e: any) {
    console.warn('sync: reflections upsert exception:', e?.message ?? e);
  }
}

export async function syncReflectionsFromSupabase(
  userId: string
): Promise<ReflectionReport[] | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('reflection_reports')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('sync: reflections fetch error:', error.message);
      return null;
    }

    return (data ?? []).map(rowToReflection);
  } catch (e: any) {
    console.warn('sync: reflections fetch exception:', e?.message ?? e);
    return null;
  }
}

// ── Delete all coaching data for a user ─────────────────────
export async function deleteCoachingData(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await Promise.all([
      supabase.from('coaching_nudges').delete().eq('user_id', userId),
      supabase.from('reflection_reports').delete().eq('user_id', userId),
    ]);
  } catch (e: any) {
    console.warn('sync: deleteCoaching error:', e?.message ?? e);
  }
}
