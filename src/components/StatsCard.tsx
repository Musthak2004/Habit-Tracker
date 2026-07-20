import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatItem {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}

interface StatsCardProps {
  title: string;
  stats: StatItem[];
}

export default function StatsCard({ title, stats }: StatsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {stats.map((stat, i) => (
          <View key={i} style={[styles.statItem, i % 2 === 0 ? styles.statItemLeft : styles.statItemRight]}>
            <View style={styles.statContent}>
              <Text style={styles.icon}>{stat.icon}</Text>
              <View style={styles.statTextCol}>
                <Text
                  style={[styles.value, stat.color ? { color: stat.color } : null]}
                  numberOfLines={1}
                >
                  {stat.value}
                </Text>
                <Text style={styles.label} numberOfLines={1}>
                  {stat.label}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 4,
  },
  statItemLeft: {
    paddingRight: 4,
  },
  statItemRight: {
    paddingLeft: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8ff',
    borderRadius: 12,
    padding: 12,
  },
  icon: {
    fontSize: 22,
    marginRight: 10,
  },
  statTextCol: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  label: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    // Single line with ellipsis to prevent wrapping
  },
});
