# Habit Tracker 🎯

A full-featured habit-tracking mobile app built with **Expo SDK 57** (React Native). Track daily habits, build streaks, complete challenges, and celebrate your progress — all on your device.

## ✨ Features

- **Boolean & Volume Habits** — Simple check-in habits (done/not done) or quantity-based habits (e.g., drink 8 glasses of water)
- **Streak Tracking** — Automatic current and longest streak calculation for every habit
- **Challenges** — Create custom challenges with rewards, or start with the 3-day onboarding kickstart
- **Rich Analytics** — 30-day bar charts, weekly/monthly stats, consistency percentages, and a 7-day activity log
- **Celebration Feedback** — Visual reward overlay with animated particle effects, haptic feedback, and programmatic chime sounds
- **Push Notifications** — Daily reminders at your preferred time, with optional per-habit reminder times
- **Developer Tools** — Built-in debug console with date override, challenge simulation, and state inspector

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Onboarding** | 4-step intro that creates a 3-day kickstart challenge |
| **Home** | Habit list, challenge cards, daily progress bar, FAB to add habits |
| **Add Habit** | Full form: name, type (boolean/volume), target count, optional reminder time |
| **History** | Overall stats, per-habit 30-day chart, 7-day activity log with dot indicators |
| **Challenge** | Day-by-day breakdown, progress bar, stats, reward claim |
| **Create Challenge** | Form with duration, required daily, reward, emoji, optional habit link |
| **Settings** | Notifications, sound/haptic toggles, app info, delete all data |
| **Developer** | Date override, toggle habits on any date, challenge simulation, state inspector |

## 🏗 Architecture

```
App.tsx                    → SafeAreaProvider → AppProvider → AppNavigator
src/
  types.ts                 → Habit, Challenge, HabitStats, AppSettings
  storage.ts               → AsyncStorage CRUD (3 keys)
  context/AppContext.tsx    → useReducer + Context + derived helpers
  navigation/              → NativeStackNavigator (8 screens)
  screens/                 → 8 screen components
  components/              → Reusable UI components
  utils/                   → haptics, sounds (programmatic WAV), notifications
```

**State Management**: React Context + `useReducer` with 12 action types. Auto-saves to AsyncStorage with 300ms debounce.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the Expo dev server
npm start

# Or start for a specific platform
npm run web       # Web (react-native-web)
npm run ios       # iOS simulator
npm run android   # Android emulator/device

# TypeScript check
npx tsc --noEmit
```

## 🛠 Tech Stack

- **Framework**: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- **Language**: TypeScript 6.0 (strict mode)
- **UI**: React Native 0.86 + React 19.2
- **Navigation**: React Navigation 7 (Native Stack)
- **Storage**: AsyncStorage (device-local)
- **Charts**: react-native-svg (custom SVG bar charts)
- **Notifications**: expo-notifications
- **Haptics**: expo-haptics
- **Sound**: expo-av (programmatic WAV generation — no audio assets)

## 📄 License

MIT
