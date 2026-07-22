import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import AddHabitScreen from '../screens/AddHabitScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ChallengeScreen from '../screens/ChallengeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import NotificationToast, { showNotificationToast } from '../components/NotificationToast';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { state: coachingState, activeNudge } = useCoaching();
  const { state } = useApp();
  const { isAuthenticated } = useAuth();
  const prevNudgeCountRef = React.useRef(coachingState.nudges.length);

  // Show a simulated push notification when a new nudge arrives
  React.useEffect(() => {
    if (coachingState.nudges.length > prevNudgeCountRef.current && activeNudge) {
      prevNudgeCountRef.current = coachingState.nudges.length;
      const typeMeta: Record<string, { icon: string; label: string }> = {
        motivational: { icon: '💪', label: 'Coaching Nudge' },
        suggestion: { icon: '💡', label: 'Habit Tip' },
        insight: { icon: '🔍', label: 'Habit Insight' },
      };
      const meta = typeMeta[activeNudge.type] ?? { icon: '🤔', label: 'Coaching Nudge' };
      showNotificationToast({
        id: activeNudge.id,
        title: meta.label,
        body: activeNudge.message,
        icon: meta.icon,
      });
    }
  }, [coachingState.nudges.length, activeNudge]);

  if (!state.loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#f5f5ff' },
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : !state.settings.onboardingComplete ? (
            <Stack.Screen name="Onboarding">
              {(props) => (
                <OnboardingScreen
                  onComplete={() => {}}
                />
              )}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen
                name="AddHabit"
                component={AddHabitScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <Stack.Screen name="Challenge" component={ChallengeScreen} />
              <Stack.Screen
                name="CreateChallenge"
                component={CreateChallengeScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <Stack.Screen
                name="Developer"
                component={DeveloperScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <NotificationToast />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5ff',
  },
});
