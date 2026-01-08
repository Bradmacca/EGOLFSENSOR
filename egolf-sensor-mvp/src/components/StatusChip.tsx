/**
 * Status Chip Component
 * 
 * Small colored indicator with label for showing status states.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusChipProps {
  label: string;
  status: 'active' | 'inactive' | 'warning' | 'error';
  size?: 'small' | 'medium';
}

const STATUS_COLORS = {
  active: '#22c55e',    // Green
  inactive: '#6b7280',  // Gray
  warning: '#f59e0b',   // Amber
  error: '#ef4444',     // Red
};

export function StatusChip({ label, status, size = 'medium' }: StatusChipProps): React.JSX.Element {
  const color = STATUS_COLORS[status];
  const isSmall = size === 'small';
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: `${color}20`, borderColor: color },
      isSmall && styles.containerSmall,
    ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[
        styles.label, 
        { color },
        isSmall && styles.labelSmall,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 12,
  },
});
