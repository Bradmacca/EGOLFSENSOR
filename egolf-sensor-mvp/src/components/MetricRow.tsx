/**
 * Metric Row Component
 * 
 * Displays a labeled metric value in a compact row format.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function MetricRow({ 
  label, 
  value, 
  unit, 
  highlight = false 
}: MetricRowProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, highlight && styles.valueHighlight]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

/**
 * Grid of 3 metric values (for x, y, z)
 */
interface MetricGridProps {
  label: string;
  x: number;
  y: number;
  z: number;
  precision?: number;
}

export function MetricGrid({ label, x, y, z, precision = 1 }: MetricGridProps): React.JSX.Element {
  return (
    <View style={styles.gridContainer}>
      <Text style={styles.gridLabel}>{label}</Text>
      <View style={styles.gridValues}>
        <View style={styles.gridItem}>
          <Text style={styles.gridAxis}>X</Text>
          <Text style={styles.gridValue}>{x.toFixed(precision)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridAxis}>Y</Text>
          <Text style={styles.gridValue}>{y.toFixed(precision)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridAxis}>Z</Text>
          <Text style={styles.gridValue}>{z.toFixed(precision)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  valueHighlight: {
    color: '#22c55e',
  },
  unit: {
    fontSize: 12,
    color: '#6b7280',
  },
  
  // Grid styles
  gridContainer: {
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  gridValues: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridItem: {
    alignItems: 'center',
  },
  gridAxis: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
});
