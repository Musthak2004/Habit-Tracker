import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCoaching } from '../context/CoachingContext';
import { STORAGE_KEYS, DEFAULT_COACHING_SETTINGS } from '../types';
import { isAIConfigured, getAIModel } from '../lib/ai';
import {
  initNotifications,
  scheduleAllHabitReminders,
  scheduleDailyReminder,
  cancelAllNotifications,
} from '../utils/notifications';
import { triggerHaptic } from '../utils/haptics';

interface SettingsScreenProps {
  navigation: any;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00',
  '12:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00',
];

const COACHING_TIME_OPTIONS = [
  '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00',
];

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { state, dispatch, getTodayCompletions } = useApp();
  const { user, signOut, isAuthenticated } = useAuth();
  const {
    state: coachingState,
    generateReflection,
    isAIConfigured: aiAvailable,
    updateCoachingSettings,
  } = useCoaching();

  const [notifGranted, setNotifGranted] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);

  useEffect(() => {
    initNotifications().then(setNotifGranted);
  }, []);

  const toggleNotifications = async (enabled: boolean) => {
    triggerHaptic('light');
    dispatch({ type: 'UPDATE_SETTINGS', settings: { notificationsEnabled: enabled } });

    if (enabled) {
      const granted = await initNotifications();
      setNotifGranted(granted);
      if (granted) {
        const activeHabits = state.habits.filter((h) => !h.archived);
        await scheduleAllHabitReminders(activeHabits, state.settings.notificationTime);
      }
    } else {
      await cancelAllNotifications();
    }
  };

  const handleTimeChange = async (time: string) => {
    triggerHaptic('light');
    dispatch({ type: 'UPDATE_SETTINGS', settings: { notificationTime: time } });

    if (state.settings.notificationsEnabled && notifGranted) {
      const activeHabits = state.habits.filter((h) => !h.archived);
      await scheduleAllHabitReminders(activeHabits, time);
    }

    // Show confirmation
    setJustConfirmed(time);
    setTimeout(() => setJustConfirmed(null), 2000);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Data',
      'This will remove all habits, challenges, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'CLEAR_ALL' });
            triggerHaptic('medium');
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const activeHabits = state.habits.filter((h) => !h.archived);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Signed in as</Text>
            <Text style={styles.accountEmail}>{user?.email ?? '—'}</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => {
              triggerHaptic('medium');
              Alert.alert(
                'Sign Out',
                'Your data is safely stored in the cloud. You can sign back in anytime.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: signOut,
                  },
                ]
              );
            }}
          >
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.notifCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowText}>
              <Text style={styles.settingLabel}>Daily Reminders</Text>
              <Text style={styles.settingDesc}>
                Get reminded to complete your habits{'\n'}Set per-habit times when creating a habit
              </Text>
            </View>
            <Switch
              value={state.settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
              thumbColor={state.settings.notificationsEnabled ? '#6c63ff' : '#999'}
            />
          </View>

          {state.settings.notificationsEnabled && (
            <View style={styles.timeSection}>
              <Text style={styles.subLabel}>Default Reminder Time</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.timePicker}
              >
                {TIME_OPTIONS.map((time) => {
                  const [h, m] = time.split(':');
                  const isAM = parseInt(h) < 12;
                  const display = `${h}:${m} ${isAM ? 'AM' : 'PM'}`;
                  const isSelected = state.settings.notificationTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipActive,
                      ]}
                      onPress={() => handleTimeChange(time)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextActive,
                        ]}
                      >
                        {display}
                      </Text>
                      {isSelected && justConfirmed === time && (
                        <Text style={styles.timeChipCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {justConfirmed && (
                <View style={styles.confirmBadge}>
                  <Text style={styles.confirmText}>
                    ✅ Reminders set for daily at {justConfirmed}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Sound & Haptics */}
        <Text style={styles.sectionTitle}>Feedback</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingDesc}>
                Play chime when completing a habit
              </Text>
            </View>
            <Switch
              value={state.settings.soundEnabled}
              onValueChange={(val) => {
                triggerHaptic('light');
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  settings: { soundEnabled: val },
                });
              }}
              trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
              thumbColor={state.settings.soundEnabled ? '#6c63ff' : '#999'}
            />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDesc}>
                Vibrate when completing a habit
              </Text>
            </View>
            <Switch
              value={state.settings.hapticsEnabled}
              onValueChange={(val) => {
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  settings: { hapticsEnabled: val },
                });
              }}
              trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
              thumbColor={state.settings.hapticsEnabled ? '#6c63ff' : '#999'}
            />
          </View>
        </View>

        {/* AI Coaching */}
        <Text style={styles.sectionTitle}>🧠 AI Coaching</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Smart Coaching</Text>
              <Text style={styles.settingDesc}>
                AI-powered nudges and motivational messages
              </Text>
            </View>
            <Switch
              value={coachingState.settings.coachingEnabled}
              onValueChange={(val) => {
                triggerHaptic('light');
                updateCoachingSettings({ coachingEnabled: val });
              }}
              trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
              thumbColor={coachingState.settings.coachingEnabled ? '#6c63ff' : '#999'}
            />
          </View>

          {coachingState.settings.coachingEnabled && (
            <>
              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>📊 Weekly Reports</Text>
                  <Text style={styles.settingDesc}>
                    AI-generated weekly habit analysis
                  </Text>
                </View>
                <Switch
                  value={coachingState.settings.reflectionWeekly}
                  onValueChange={(val) => {
                    triggerHaptic('light');
                    updateCoachingSettings({ reflectionWeekly: val });
                  }}
                  trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
                  thumbColor={coachingState.settings.reflectionWeekly ? '#6c63ff' : '#999'}
                />
              </View>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>📈 Monthly Reports</Text>
                  <Text style={styles.settingDesc}>
                    AI-powered monthly performance deep-dive
                  </Text>
                </View>
                <Switch
                  value={coachingState.settings.reflectionMonthly}
                  onValueChange={(val) => {
                    triggerHaptic('light');
                    updateCoachingSettings({ reflectionMonthly: val });
                  }}
                  trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
                  thumbColor={coachingState.settings.reflectionMonthly ? '#6c63ff' : '#999'}
                />
              </View>

              {/* Coaching Push Notifications */}
              <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4, paddingTop: 12 }]}>
                <View>
                  <Text style={styles.settingLabel}>🚀 Push Coaching</Text>
                  <Text style={styles.settingDesc}>
                    Get a push notification at your chosen time with a personalized coaching message
                  </Text>
                </View>
                <Switch
                  value={coachingState.settings.coachingNotificationEnabled}
                  onValueChange={(val) => {
                    triggerHaptic('light');
                    updateCoachingSettings({ coachingNotificationEnabled: val });
                  }}
                  trackColor={{ false: '#e0e0e0', true: '#c4b5fd' }}
                  thumbColor={coachingState.settings.coachingNotificationEnabled ? '#6c63ff' : '#999'}
                />
              </View>

              {coachingState.settings.coachingNotificationEnabled && (
                <View style={styles.timeSection}>
                  <Text style={styles.subLabel}>Coaching Notification Time</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.timePicker}
                  >
                    {COACHING_TIME_OPTIONS.map((time) => {
                      const [h, m] = time.split(':');
                      const isAM = parseInt(h) < 12;
                      const display = `${h}:${m} ${isAM ? 'AM' : 'PM'}`;
                      const isSelected = coachingState.settings.coachingNotificationTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeChip,
                            isSelected && styles.timeChipActive,
                          ]}
                          onPress={() => {
                            triggerHaptic('light');
                            updateCoachingSettings({ coachingNotificationTime: time });
                          }}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              isSelected && styles.timeChipTextActive,
                            ]}
                          >
                            {display}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.aiInfoRow}>
                <Text style={styles.aiInfoLabel}>
                  {aiAvailable ? '✅ AI configured' : '⚠️ AI not configured'}
                </Text>
                <Text style={styles.aiInfoModel}>
                  {aiAvailable ? `Model: ${getAIModel()}` : 'Set EXPO_PUBLIC_AI_API_KEY'}
                </Text>
              </View>

              {/* Generate on-demand */}
              <View style={styles.generateRow}>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={() => {
                    triggerHaptic('light');
                    generateReflection('weekly');
                  }}
                >
                  <Text style={styles.generateBtnText}>📅 Generate Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={() => {
                    triggerHaptic('light');
                    generateReflection('monthly');
                  }}
                >
                  <Text style={styles.generateBtnText}>📆 Generate Monthly</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* App Info */}
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.settingCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Habits</Text>
            <Text style={styles.infoValue}>{activeHabits.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Challenges</Text>
            <Text style={styles.infoValue}>{state.challenges.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>2.0.0</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleDeleteAll}
        >
          <Text style={styles.dangerBtnText}>🗑️ Delete All Data</Text>
        </TouchableOpacity>
        {/* Create Challenge */}
        <Text style={styles.sectionTitle}>Challenges</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('CreateChallenge');
          }}
        >
          <Text style={styles.actionCardEmoji}>🏆</Text>
          <View style={styles.actionCardText}>
            <Text style={styles.actionCardLabel}>Create New Challenge</Text>
            <Text style={styles.actionCardDesc}>Design your own challenge with custom goals and rewards</Text>
          </View>
          <Text style={styles.actionCardArrow}>›</Text>
        </TouchableOpacity>

        {/* Developer */}
        <Text style={styles.sectionTitle}>Developer</Text>
        <TouchableOpacity
          style={styles.devBtn}
          onPress={() => navigation.navigate('Developer')}
        >
          <Text style={styles.devBtnIcon}>🛠️</Text>
          <View style={styles.devBtnTextCol}>
            <Text style={styles.devBtnLabel}>Developer Console</Text>
            <Text style={styles.devBtnDesc}>Debug tools, date override, challenge simulator</Text>
          </View>
          <Text style={styles.devBtnArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  closeText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  accountRow: {
    marginBottom: 12,
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  signOutBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  settingRowText: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    color: '#666',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  timeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timePicker: {
    flexDirection: 'row',
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e8e8ee',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeChipActive: {
    backgroundColor: '#6c63ff',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  timeChipTextActive: {
    color: '#fff',
  },
  timeChipCheck: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  confirmBadge: {
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  confirmText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#555',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  dangerBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    marginBottom: 16,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  actionCardEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  actionCardDesc: {
    fontSize: 13,
    color: '#666',
  },
  actionCardArrow: {
    fontSize: 22,
    color: '#999',
    marginLeft: 8,
  },
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0ff',
  },
  devBtnIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  devBtnTextCol: {
    flex: 1,
  },
  devBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  devBtnDesc: {
    fontSize: 12,
    color: '#666',
  },
  devBtnArrow: {
    fontSize: 22,
    color: '#999',
    marginLeft: 8,
  },
  aiInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  aiInfoLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  aiInfoModel: {
    fontSize: 12,
    color: '#aaa',
  },
  generateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  generateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8f7ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4d0ff',
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c63ff',
  },
});
