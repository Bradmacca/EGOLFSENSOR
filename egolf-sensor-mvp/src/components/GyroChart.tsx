/**
 * Gyro Magnitude Chart Component
 * 
 * Simple line chart showing gyro magnitude over time.
 * Uses SVG for rendering without heavy chart libraries.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import { SensorSample, SwingEvent } from '../types';
import { vectorMagnitude, mapRange } from '../utils/math';

interface GyroChartProps {
  samples: SensorSample[];
  events?: SwingEvent[];
  width?: number;
  height?: number;
  maxGyro?: number;
}

const EVENT_COLORS: Record<string, string> = {
  address: '#6b7280',
  start: '#3b82f6',
  top: '#f59e0b',
  impact: '#ef4444',
  finish: '#22c55e',
};

export function GyroChart({
  samples,
  events = [],
  width = Dimensions.get('window').width - 32,
  height = 200,
  maxGyro = 2000,
}: GyroChartProps): React.JSX.Element {
  const paddingLeft = 45;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  // Calculate path and stats
  const { path, minTime, maxTime, peakValue } = useMemo(() => {
    if (samples.length === 0) {
      return { path: '', minTime: 0, maxTime: 1000, peakValue: 0 };
    }
    
    const times = samples.map(s => s.timestampMs);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const timeRange = maxT - minT || 1;
    
    let peak = 0;
    const points = samples.map((sample, i) => {
      const mag = vectorMagnitude(sample.gyro);
      if (mag > peak) peak = mag;
      
      const x = paddingLeft + ((sample.timestampMs - minT) / timeRange) * chartWidth;
      const y = paddingTop + chartHeight - (Math.min(mag, maxGyro) / maxGyro) * chartHeight;
      
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return { path: points, minTime: minT, maxTime: maxT, peakValue: peak };
  }, [samples, chartWidth, chartHeight, maxGyro]);
  
  // Calculate event markers
  const eventMarkers = useMemo(() => {
    if (samples.length === 0 || events.length === 0) return [];
    
    const timeRange = maxTime - minTime || 1;
    
    return events.map(event => ({
      x: paddingLeft + ((event.timestampMs - minTime) / timeRange) * chartWidth,
      type: event.type,
      color: EVENT_COLORS[event.type] || '#ffffff',
    }));
  }, [events, minTime, maxTime, chartWidth]);
  
  // Y-axis labels
  const yLabels = [0, maxGyro / 4, maxGyro / 2, (maxGyro * 3) / 4, maxGyro];
  
  // X-axis labels (time)
  const duration = maxTime - minTime;
  const xLabelCount = 5;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const time = (i / (xLabelCount - 1)) * duration;
    return {
      value: time,
      x: paddingLeft + (i / (xLabelCount - 1)) * chartWidth,
    };
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gyro Magnitude (°/s)</Text>
      
      <Svg width={width} height={height}>
        {/* Background */}
        <Rect
          x={paddingLeft}
          y={paddingTop}
          width={chartWidth}
          height={chartHeight}
          fill="#1a1a2e"
          rx={4}
        />
        
        {/* Grid lines */}
        {yLabels.map((value, i) => {
          const y = paddingTop + chartHeight - (value / maxGyro) * chartHeight;
          return (
            <G key={`y-${i}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#2d3748"
                strokeWidth={1}
              />
              <SvgText
                x={paddingLeft - 5}
                y={y + 4}
                fill="#6b7280"
                fontSize={10}
                textAnchor="end"
              >
                {value}
              </SvgText>
            </G>
          );
        })}
        
        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <SvgText
            key={`x-${i}`}
            x={label.x}
            y={height - 8}
            fill="#6b7280"
            fontSize={10}
            textAnchor="middle"
          >
            {(label.value / 1000).toFixed(1)}s
          </SvgText>
        ))}
        
        {/* Data line */}
        {path && (
          <Path
            d={path}
            stroke="#3b82f6"
            strokeWidth={2}
            fill="none"
          />
        )}
        
        {/* Event markers */}
        {eventMarkers.map((marker, i) => (
          <G key={`event-${i}`}>
            <Line
              x1={marker.x}
              y1={paddingTop}
              x2={marker.x}
              y2={paddingTop + chartHeight}
              stroke={marker.color}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            <Circle
              cx={marker.x}
              cy={paddingTop + 8}
              r={6}
              fill={marker.color}
            />
            <SvgText
              x={marker.x}
              y={paddingTop + 11}
              fill="#ffffff"
              fontSize={8}
              fontWeight="bold"
              textAnchor="middle"
            >
              {marker.type[0].toUpperCase()}
            </SvgText>
          </G>
        ))}
      </Svg>
      
      {/* Legend */}
      {events.length > 0 && (
        <View style={styles.legend}>
          {Object.entries(EVENT_COLORS).map(([type, color]) => {
            const hasEvent = events.some(e => e.type === type);
            if (!hasEvent) return null;
            return (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      
      {/* Peak indicator */}
      <Text style={styles.peakText}>
        Peak: {peakValue.toFixed(0)} °/s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  peakText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'right',
  },
});
