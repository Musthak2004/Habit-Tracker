# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Habit Tracker — Expo / React Native

## Project

A habit-tracking mobile app built with **Expo SDK 57** (React 19.2, TypeScript 6.0, RN 0.86). Core loop: track habits → visual/haptic/chime celebration → repeat. Supports boolean (once-daily check-in) and volume (N-times-daily counter) habits, challenges with rewards, analytics, and push notification reminders.

## Screens (8 total)

| Screen | Nav | Purpose |
|--------|-----|---------|
| `OnboardingScreen` | Conditional (init) | 4-step intro → creates a 3-day onboarding challenge |
| `HomeScreen` | Main tab | Habit list, challenge cards, progress bar, FAB, bottom nav |
| `AddHabitScreen` | Modal | Full form: name, type picker (boolean/volume), target counter, per-habit reminder time |
| `HistoryScreen` | Modal | Overall stats, habit selector, per-habit 30-day SVG chart, 7-day log, detailed stats |
| `ChallengeScreen` | Push | Day-by-day progress, stats, reward claim, day breakdown |
| `CreateChallengeScreen` | Modal | Form: name, description, duration, required daily, reward, emoji, optional habit link |
| `SettingsScreen` | Modal | Notifications toggle + time picker, sound/haptic toggles, delete all data, link to Developer |
| `DeveloperScreen` | Modal | Date override, habit toggle on any date, challenge simulators, state inspector, reset onboarding |

Navigation uses React Navigation's `NativeStackNavigator` with conditional stacks: Onboarding screens vs. main stack (shown after `settings.onboardingComplete` is true). Modal presentations use `slide_from_bottom`.

## Architecture

```
App.tsx                              → SafeAreaProvider → AppProvider → AppNavigator
src/
  types.ts                           → Habit, Challenge, LogEntry, HabitStats, StreakInfo, AppSettings
  storage.ts                         → AsyncStorage CRUD (3 keys: habits, challenges, settings)
  context/
    AppContext.tsx                    → useReducer + Context with derived helpers (streak, stats, progress)
  navigation/
    AppNavigator.tsx                  → NativeStackNavigator with conditional onboarding stack
    types.ts                         → RootStackParamList
  screens/
    OnboardingScreen.tsx             → 4-step intro, creates onboarding challenge, marks onboarding complete
    HomeScreen.tsx                   → Habit list, challenge cards, progress bar, bottom nav, FAB, reward overlay
    AddHabitScreen.tsx               → Full-screen habit creation form
    HistoryScreen.tsx                → Analytics: overall stats, per-habit 30-day chart, 7-day activity log
    ChallengeScreen.tsx              → Day-by-day challenge tracking, reward claim
    CreateChallengeScreen.tsx        → Challenge creation form with all options
    SettingsScreen.tsx               → Notifications, sound/haptic toggles, danger zone
    DeveloperScreen.tsx              → Debug tools: date override, toggle on date, challenge simulation, state inspector
  components/
    HabitCard.tsx                    → Habit row: checkbox/progress, name, streak, long-press delete
    ChallengeCard.tsx                → Challenge card: emoji, progress bar, days remaining, reward
    StatsCard.tsx                    → 2-column stat grid (icon + value + label)
    CompletionChart.tsx              → SVG bar chart via react-native-svg (30-day view, target lines)
    RewardOverlay.tsx                → Animated celebration with particle emitters (12 particles)
    AddHabitModal.tsx                → Simple modal for quick habit creation (name only, used by HomeScreen)
  utils/
    haptics.ts                       → expo-haptics wrapper (6 types, try/catch for web fallback)
    sounds.ts                        → Programmatic WAV generation (chime + reward fanfare) via expo-av
    notifications.ts                 → expo-notifications: init, daily reminders, per-habit scheduling, challenge alerts
```

## State Management

- **React Context + `useReducer`** — single `AppContext` provides state + dispatch + 5 derived helpers
- **Persistence**: debounced (300ms) auto-save via `useEffect` watching habits/challenges/settings
- **Derived helpers** (memo'd via `useCallback`): `getHabitStats`, `getStreak`, `getTodayCompletions`, `getActiveChallenges`, `getTodayProgress`
- **Streak calculation**: sorts completion dates in reverse, checks contiguous days from today

## Key Patterns

- **No third-party state library** — pure Context + useReducer with 12 action types
- **Haptics/Sound**: conditional on user settings (`state.settings.hapticsEnabled`, `soundEnabled`); wrapped in try/catch for web fallback. `triggerHaptic()` called explicitly from each screen rather than centralized
- **Sound effects**: generated programmatically as sine-wave WAV via DataView (chime: C5 300ms; fanfare: C5→E5→G5 arpeggio) — no audio asset files
- **Notifications**: init on SettingsScreen mount, `DAILY` trigger type with `SchedulableTriggerInputTypes.DAILY`. Per-habit reminder times supported. Android notification channel `habit-reminders`
- **Challenges**: day-by-day tracking with per-day completion check, reward claiming with `claimedAt` timestamp
- **Completed/completion tracking**: `completions` is `Record<string, number>` keyed by `"YYYY-MM-DD"` — boolean habits store 1, volume habits store count up to `targetCount`
- **Colors**: purple `#6c63ff` (primary), green `#22c55e` (success), red `#ef4444` (danger), bg `#f5f5ff`
- **Expo SDK 57**: React 19.2, TypeScript 6.0 (strict mode), React Native 0.86
- **React Navigation 7**: `@react-navigation/native` v7, `@react-navigation/native-stack` v7

## Commands

```bash
npm start           # Start Expo dev server
npm run web         # Start for web (react-native-web)
npm run ios         # Start for iOS simulator
npm run android     # Start for Android emulator/device
npx tsc --noEmit    # TypeScript check
```

## Notable Gaps

- No test suite or testing framework installed
- No ESLint/Prettier config (no linting command available)
- No CI/CD pipeline
- No cloud sync — data is device-local via AsyncStorage
- `LogEntry` type defined but no log system implemented (the `LOGS` storage key is unused)
- `dist/` directory is committed but not in `.gitignore` (the `.gitignore` is inside `habit-tracker/`, not at repo root)
- `HomeScreen.tsx` (494 sloc) and `SettingsScreen.tsx` (508 sloc) are near/over the 500-line limit
- `AddHabitScreen.tsx` uses an inline `import('../types').Habit` type annotation rather than importing at the top of the file
