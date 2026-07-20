import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  AddHabit: undefined;
  History: undefined;
  Challenge: { challengeId: string };
  CreateChallenge: undefined;
  Developer: undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
