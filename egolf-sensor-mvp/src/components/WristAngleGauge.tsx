/**
 * Wrist Angle Gauge Component
 * 
 * Semi-circular dial showing wrist angle (roll/pitch proxy).
 * Inspired by HackMotion UI style.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText, Line } from 'react-native-svg';
import { clamp, mapRange } from '../utils/math';

interface WristAngleGaugeProps {
  /** Current angle in degrees (-90 to 90 typical range) */
  angle: number;
  /** Label for the gauge */
  label?: string;
  /** Min angle for the gauge */
  minAngle?: number;
  /** Max angle for the gauge */
  maxAngle?: number;
  /** Target zone (optional) */
  targetZone?: { min: number; max: number };
  /** Size of the gauge */
  size?: number;
}

export function WristAngleGauge({
  angle,
  label = 'Wrist Angle',
  minAngle = -60,
  maxAngle = 60,
  targetZone,
  size = 200,
}: WristAngleGaugeProps): React.JSX.Element {
  const centerX = size / 2;
  const centerY = size * 0.7;
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;
  
  // Normalize angle to gauge range
  const normalizedAngle = clamp(angle, minAngle, maxAngle);
  
  // Convert angle to arc position (180 deg arc from -90 to 90)
  // Map minAngle->maxAngle to -150deg->-30deg (pointing up)
  const needleAngle = mapRange(normalizedAngle, minAngle, maxAngle, -150, -30);
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius * 0.85;
  const needleX = centerX + Math.cos(needleRad) * needleLength;
  const needleY = centerY + Math.sin(needleRad) * needleLength;
  
  // Create arc path
  const startAngle = -150;
  const endAngle = -30;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  const x1 = centerX + Math.cos(startRad) * radius;
  const y1 = centerY + Math.sin(startRad) * radius;
  const x2 = centerX + Math.cos(endRad) * radius;
  const y2 = centerY + Math.sin(endRad) * radius;
  
  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  
  // Target zone arc (if provided)
  let targetPath = '';
  if (targetZone) {
    const tzStartAngle = mapRange(
      clamp(targetZone.min, minAngle, maxAngle), 
      minAngle, maxAngle, -150, -30
    );
    const tzEndAngle = mapRange(
      clamp(targetZone.max, minAngle, maxAngle), 
      minAngle, maxAngle, -150, -30
    );
    const tzStartRad = (tzStartAngle * Math.PI) / 180;
    const tzEndRad = (tzEndAngle * Math.PI) / 180;
    
    const tzX1 = centerX + Math.cos(tzStartRad) * radius;
    const tzY1 = centerY + Math.sin(tzStartRad) * radius;
    const tzX2 = centerX + Math.cos(tzEndRad) * radius;
    const tzY2 = centerY + Math.sin(tzEndRad) * radius;
    
    targetPath = `M ${tzX1} ${tzY1} A ${radius} ${radius} 0 0 1 ${tzX2} ${tzY2}`;
  }
  
  // Tick marks
  const ticks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const tickAngle = -150 + (i / tickCount) * 120;
    const tickRad = (tickAngle * Math.PI) / 180;
    const innerRadius = radius - strokeWidth / 2 - 5;
    const outerRadius = radius + strokeWidth / 2 + 5;
    
    ticks.push({
      x1: centerX + Math.cos(tickRad) * innerRadius,
      y1: centerY + Math.sin(tickRad) * innerRadius,
      x2: centerX + Math.cos(tickRad) * outerRadius,
      y2: centerY + Math.sin(tickRad) * outerRadius,
      label: Math.round(minAngle + (i / tickCount) * (maxAngle - minAngle)),
      labelX: centerX + Math.cos(tickRad) * (outerRadius + 12),
      labelY: centerY + Math.sin(tickRad) * (outerRadius + 12),
    });
  }
  
  // Determine color based on position
  const getColor = () => {
    if (targetZone) {
      if (normalizedAngle >= targetZone.min && normalizedAngle <= targetZone.max) {
        return '#22c55e'; // Green - in zone
      } else {
        const distance = Math.min(
          Math.abs(normalizedAngle - targetZone.min),
          Math.abs(normalizedAngle - targetZone.max)
        );
        if (distance < 10) return '#f59e0b'; // Amber - close
        return '#ef4444'; // Red - far
      }
    }
    return '#3b82f6'; // Default blue
  };
  
  const needleColor = getColor();
  
  return (
    <View style={styles.container}>
      <Svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        {/* Background arc */}
        <Path
          d={arcPath}
          stroke="#2d3748"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Target zone arc */}
        {targetPath && (
          <Path
            d={targetPath}
            stroke="#22c55e40"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
        
        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <G key={i}>
            <Line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#4a5568"
              strokeWidth={2}
            />
            <SvgText
              x={tick.labelX}
              y={tick.labelY}
              fill="#9ca3af"
              fontSize={10}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {tick.label}°
            </SvgText>
          </G>
        ))}
        
        {/* Needle */}
        <Line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={needleColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Center circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={needleColor}
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill="#1a1a2e"
        />
      </Svg>
      
      {/* Value display */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: needleColor }]}>
          {angle.toFixed(1)}°
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    marginTop: -20,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
});
