import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

// ── Types ──────────────────────────────────────────────────
export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
}

type ToastListener = (notification: ToastNotification) => void;

// ── Singleton emitter (simple pub/sub, no deps) ────────────
let listeners: ToastListener[] = [];

export function showNotificationToast(n: ToastNotification) {
  listeners.forEach((fn) => fn(n));
}

function subscribe(fn: ToastListener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

// ── Component ──────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const TOAST_HEIGHT = 90;
const AUTO_DISMISS_MS = 5000;

export default function NotificationToast() {
  const [notification, setNotification] = useState<ToastNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-TOAST_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -TOAST_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setNotification(null));
  }, [slideAnim, fadeAnim]);

  const show = useCallback(
    (n: ToastNotification) => {
      // Clear any pending dismiss
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setNotification(n);

      // Reset position
      slideAnim.setValue(-TOAST_HEIGHT);
      fadeAnim.setValue(0);

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timeoutRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    },
    [slideAnim, fadeAnim, dismiss]
  );

  // Subscribe to global toast events
  useEffect(() => {
    const unsub = subscribe(show);
    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [show]);

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        {/* App icon area */}
        <View style={styles.iconArea}>
          <Text style={styles.appIcon}>📱</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.appLabel}>Habit Tracker</Text>
            <Text style={styles.timeLabel}>now</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {notification.icon} {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40, // Safe area / status bar
    paddingHorizontal: 10,
  },
  inner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    minHeight: 80,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconArea: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  appIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  appLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeLabel: {
    fontSize: 11,
    color: '#aaa',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});
