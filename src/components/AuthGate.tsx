import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Full-screen loading state shown while Supabase checks for a stored session.
 * Prevents flash of the auth screen during session restore.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.text}>Loading…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5ff',
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
});
