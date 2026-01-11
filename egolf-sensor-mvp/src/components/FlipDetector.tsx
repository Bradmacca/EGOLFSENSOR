/**
 * Flip Detector Component
 * 
 * Displays flip status tile and cue for wrist angle stability through impact.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { FlipStatus } from '../types/calibration';

interface FlipDetectorProps {
  /** Current flip status */
  status: FlipStatus;
  
  /** Optional angle delta for display */
  angleDelta?: number;
  
  /** Show detailed information */
  showDetails?: boolean;
}

export function FlipDetector({
  status,
  angleDelta,
  showDetails = false,
}: FlipDetectorProps): React.JSX.Element {
  const getStatusColor = (): string => {
    switch (status) {
      case 'Flipped':
        return '#ef4444'; // Red
      case 'Not Flipped':
        return '#22c55e'; // Green
      case 'Unknown':
        return '#6b7280'; // Gray
    }
  };
  
  const getStatusBgColor = (): string => {
    switch (status) {
      case 'Flipped':
        return '#ef444420';
      case 'Not Flipped':
        return '#22c55e20';
      case 'Unknown':
        return '#1e1e2d';
    }
  };
  
  const getStatusText = (): string => {
    switch (status) {
      case 'Flipped':
        return 'Flipped';
      case 'Not Flipped':
        return 'Stable';
      case 'Unknown':
        return 'Waiting';
    }
  };
  
  const getCueText = (): string => {
    switch (status) {
      case 'Flipped':
        return 'Keep wrist angle stable through impact';
      case 'Not Flipped':
        return 'Good wrist stability';
      case 'Unknown':
        return 'Waiting for impact event';
    }
  };
  
  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();
  
  return (
    <View style={styles.container}>
      <View style={[styles.statusTile, { backgroundColor: statusBgColor, borderColor: statusColor }]}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>Flip Status</Text>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getStatusText()}
        </Text>
        {showDetails && angleDelta !== undefined && (
          <Text style={styles.angleDelta}>
            Δ {angleDelta > 0 ? '+' : ''}{angleDelta.toFixed(1)}°
          </Text>
        )}
      </View>
      
      <View style={styles.cueContainer}>
        <Text style={styles.cueText}>
          {getCueText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  statusTile: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  angleDelta: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  cueContainer: {
    paddingHorizontal: 4,
  },
  cueText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
