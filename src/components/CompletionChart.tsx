import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DayData {
  date: string;
  count: number;
  target: number;
}

interface CompletionChartProps {
  data: DayData[];
  height?: number;
  color?: string;
}

export default function CompletionChart({
  data,
  height = 120,
  color = '#6c63ff',
}: CompletionChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const paddingTop = 8;
  const paddingBottom = 20;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxCount = Math.max(...data.map((d) => d.target), 1);
  const barGap = 2;

  return (
    <View style={styles.container}>
      {/* Horizontal grid lines */}
      <View style={[StyleSheet.absoluteFill, { paddingTop, height }]} pointerEvents="none">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <View
            key={frac}
            style={[
              styles.gridLine,
              { top: paddingTop + chartHeight * (1 - frac) },
            ]}
          />
        ))}
      </View>

      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((day, i) => {
          const barHeight = (day.count / maxCount) * chartHeight;
          const isComplete = day.count >= day.target;
          const dateObj = new Date(day.date + 'T00:00:00');
          const dayLabel = dateObj.toLocaleDateString('en-US', {
            weekday: 'narrow',
          });
          const showLabel = i % 5 === 0 || i === data.length - 1;

          return (
            <View key={day.date} style={styles.barCol}>
              {/* Target line */}
              {day.target > 0 && (
                <View
                  style={[
                    styles.targetLine,
                    {
                      top: paddingTop + chartHeight * (1 - day.target / maxCount),
                    },
                  ]}
                />
              )}
              {/* Bar */}
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, day.count > 0 ? 1 : 0),
                    backgroundColor: isComplete ? color : '#d4d4ff',
                    opacity: isComplete ? 1 : 0.6,
                  },
                ]}
              />
              {/* Day label */}
              {showLabel && (
                <Text style={styles.dayLabel}>{dayLabel}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    paddingVertical: 8,
    paddingRight: 4,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingBottom: 20,
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    maxWidth: 12,
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minWidth: 3,
  },
  targetLine: {
    position: 'absolute',
    left: -2,
    right: -2,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderStyle: 'dashed',
  },
  dayLabel: {
    position: 'absolute',
    bottom: -16,
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  empty: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
