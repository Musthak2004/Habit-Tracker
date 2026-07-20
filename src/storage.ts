import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Habit,
  Challenge,
  AppSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from './types';

// ── Generic helpers ──────────────────────────────────────
async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (json) return JSON.parse(json);
  } catch (e) {
    console.warn(`Failed to load ${key}`, e);
  }
  return fallback;
}

async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key}`, e);
  }
}

// ── Habits ───────────────────────────────────────────────
export async function loadHabits(): Promise<Habit[]> {
  return loadJSON<Habit[]>(STORAGE_KEYS.HABITS, []);
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  return saveJSON(STORAGE_KEYS.HABITS, habits);
}

// ── Challenges ───────────────────────────────────────────
export async function loadChallenges(): Promise<Challenge[]> {
  return loadJSON<Challenge[]>(STORAGE_KEYS.CHALLENGES, []);
}

export async function saveChallenges(challenges: Challenge[]): Promise<void> {
  return saveJSON(STORAGE_KEYS.CHALLENGES, challenges);
}

// ── Settings ─────────────────────────────────────────────
export async function loadSettings(): Promise<AppSettings> {
  return loadJSON<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return saveJSON(STORAGE_KEYS.SETTINGS, settings);
}
