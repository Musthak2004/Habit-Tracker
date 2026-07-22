import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { CoachingProvider } from './src/context/CoachingContext';
import AuthGate from './src/components/AuthGate';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <CoachingProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#f5f5ff" />
              <AppNavigator />
            </CoachingProvider>
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
