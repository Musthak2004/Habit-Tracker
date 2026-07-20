import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['✨', '⭐', '🌟', '💫', '🎉', '🎊', '🔥', '💪', '👏', '🎯'];

// Native driver doesn't work on web — use JS animations there
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface RewardOverlayProps {
  visible: boolean;
  title: string;
  subtitle: string;
  emoji: string;
  onComplete?: () => void;
}

export default function RewardOverlay({
  visible,
  title,
  subtitle,
  emoji,
  onComplete,
}: RewardOverlayProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      x: useRef(new Animated.Value(0)).current,
      y: useRef(new Animated.Value(0)).current,
      opacity: useRef(new Animated.Value(0)).current,
      scale: useRef(new Animated.Value(0)).current,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      angle: Math.random() * Math.PI * 2,
      distance: 80 + Math.random() * 120,
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scale.setValue(0);
      opacity.setValue(1);
      particles.forEach((p) => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(1);
        p.scale.setValue(0);
      });

      // Animate main content
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(1200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => {
        onComplete?.();
      });

      // Animate particles
      particles.forEach((p) => {
        const targetX = Math.cos(p.angle) * p.distance;
        const targetY = Math.sin(p.angle) * p.distance;

        Animated.parallel([
          Animated.spring(p.scale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(p.x, {
            toValue: targetX,
            duration: 800,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(p.y, {
            toValue: targetY,
            duration: 800,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ]).start();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            },
          ]}
        >
          {p.emoji}
        </Animated.Text>
      ))}

      {/* Main content */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    minWidth: 220,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
  },
});
