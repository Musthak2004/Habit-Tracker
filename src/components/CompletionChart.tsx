import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

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

  const barWidth = Math.max(3, Math.min(12, (300 - 40) / data.length - 2));
  const chartWidth = 300;
  const paddingTop = 8;
  const paddingBottom = 20;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxCount = Math.max(...data.map((d) => d.target), 1);

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = paddingTop + chartHeight * (1 - frac);
          return (
            <Line
              key={frac}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Bars */}
        {data.map((day, i) => {
          const barHeight = (day.count / maxCount) * chartHeight;
          const targetY = paddingTop + chartHeight * (1 - day.target / maxCount);
          const x = i * (barWidth + 2) + 20;

          const dateObj = new Date(day.date + 'T00:00:00');
          const dayLabel = dateObj.toLocaleDateString('en-US', {
            weekday: 'narrow',
          });

          return (
            <React.Fragment key={day.date}>
              {/* Target line */}
              {day.target > 0 && (
                <Line
                  x1={x - 2}
                  y1={targetY}
                  x2={x + barWidth + 2}
                  y2={targetY}
                  stroke="#ddd"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              )}
              {/* Bar */}
              <Rect
                x={x}
                y={paddingTop + chartHeight - barHeight}
                width={barWidth}
                height={Math.max(barHeight, day.count > 0 ? 1 : 0)}
                rx={2}
                fill={day.count >= day.target ? color : '#d4d4ff'}
                opacity={day.count >= day.target ? 1 : 0.6}
              />
              {/* Day label (show every 5th day or last) */}
              {(i % 5 === 0 || i === data.length - 1) && (
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 4}
                  fontSize={9}
                  fill="#999"
                  textAnchor="middle"
                >
                  {dayLabel}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
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
