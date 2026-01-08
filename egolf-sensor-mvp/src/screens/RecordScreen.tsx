/**
 * Record Screen
 * 
 * Session recording with start/stop button, timer, and sample count.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSensor } from '../context';
import { StatusChip } from '../components/StatusChip';
import { MetricRow } from '../components/MetricRow';
import { formatDuration } from '../utils/math';
import { SessionMetadata } from '../types';

export function RecordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {
    isUsingSimulator,
    sensorStatus,
    isStreaming,
    isRecording,
    recordingDurationMs,
    recordingSampleCount,
    recordingConfig,
    setRecordingConfig,
    startRecording,
    stopRecording,
    gyroMagnitude,
    detectedEvents,
    triggerSimulatedSwing,
  } = useSensor();
  
  const [lastSession, setLastSession] = useState<SessionMetadata | null>(null);
  
  // Check if ready to record
  const isConnected = isUsingSimulator || sensorStatus.isConnected;
  const canRecord = isConnected;
  
  // Handle record button press
  const handleRecordPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      const metadata = await stopRecording();
      if (metadata) {
        setLastSession(metadata);
        Alert.alert(
          'Recording Saved',
          `Session saved with ${metadata.sampleCount} samples.\nDuration: ${formatDuration(metadata.durationMs)}`,
          [
            { text: 'OK' },
            { 
              text: 'View Session', 
              onPress: () => {
                // Navigate to session detail
                (navigation as any).navigate('Sessions', {
                  screen: 'SessionDetail',
                  params: { sessionId: metadata.id },
                });
              }
            },
          ]
        );
      }
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (error: any) {
        Alert.alert('Recording Error', error.message || 'Failed to start recording');
      }
    }
  }, [isRecording, startRecording, stopRecording, navigation]);
  
  // Sample rate options
  const sampleRateOptions = [50, 100, 200];
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Record Session</Text>
          <View style={styles.statusRow}>
            <StatusChip
              label={isUsingSimulator ? 'Simulated' : sensorStatus.isConnected ? 'Connected' : 'Disconnected'}
              status={isConnected ? 'active' : 'error'}
              size="small"
            />
            {isRecording && (
              <StatusChip
                label="Recording"
                status="warning"
                size="small"
              />
            )}
          </View>
        </View>
        
        {/* Big Record Button */}
        <View style={styles.recordSection}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording ? styles.recordButtonStop : styles.recordButtonStart,
              !canRecord && styles.recordButtonDisabled,
            ]}
            onPress={handleRecordPress}
            disabled={!canRecord}
          >
            <View style={[
              styles.recordButtonInner,
              isRecording && styles.recordButtonInnerStop,
            ]} />
          </TouchableOpacity>
          
          <Text style={styles.recordButtonLabel}>
            {isRecording ? 'Tap to Stop' : canRecord ? 'Tap to Record' : 'Connect Sensor First'}
          </Text>
        </View>
        
        {/* Timer and Stats */}
        <View style={styles.statsSection}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerValue}>
              {formatDuration(recordingDurationMs)}
            </Text>
            <Text style={styles.timerLabel}>Duration</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recordingSampleCount}</Text>
              <Text style={styles.statLabel}>Samples</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{detectedEvents.length}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{gyroMagnitude.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Gyro °/s</Text>
            </View>
          </View>
        </View>
        
        {/* Detected Events */}
        {isRecording && detectedEvents.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Detected Events</Text>
            {detectedEvents.slice(-5).reverse().map((event, idx) => (
              <View key={idx} style={styles.eventItem}>
                <View style={[styles.eventDot, { backgroundColor: getEventColor(event.type) }]} />
                <Text style={styles.eventType}>{event.type}</Text>
                <Text style={styles.eventTime}>
                  {formatDuration(event.timestampMs)}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Simulator swing trigger */}
        {isUsingSimulator && isRecording && (
          <View style={styles.simulatorSection}>
            <TouchableOpacity
              style={styles.swingButton}
              onPress={triggerSimulatedSwing}
            >
              <Text style={styles.swingButtonText}>🏌️ Trigger Simulated Swing</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Recording Config */}
        {!isRecording && (
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>Recording Settings</Text>
            
            <Text style={styles.configLabel}>Sample Rate</Text>
            <View style={styles.rateOptions}>
              {sampleRateOptions.map(rate => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.rateOption,
                    recordingConfig.targetSampleRate === rate && styles.rateOptionSelected,
                  ]}
                  onPress={() => setRecordingConfig({ targetSampleRate: rate })}
                >
                  <Text style={[
                    styles.rateOptionText,
                    recordingConfig.targetSampleRate === rate && styles.rateOptionTextSelected,
                  ]}>
                    {rate} Hz
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <MetricRow
              label="Event Detection"
              value={recordingConfig.detectEvents ? 'Enabled' : 'Disabled'}
            />
          </View>
        )}
        
        {/* Last Session Info */}
        {lastSession && !isRecording && (
          <View style={styles.lastSessionSection}>
            <Text style={styles.sectionTitle}>Last Recording</Text>
            <MetricRow label="Name" value={lastSession.name} />
            <MetricRow label="Duration" value={formatDuration(lastSession.durationMs)} />
            <MetricRow label="Samples" value={lastSession.sampleCount} />
            <MetricRow label="Events" value={lastSession.events.length} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    address: '#6b7280',
    start: '#3b82f6',
    top: '#f59e0b',
    impact: '#ef4444',
    finish: '#22c55e',
  };
  return colors[type] || '#9ca3af';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recordSection: {
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonStart: {
    borderColor: '#ef4444',
  },
  recordButtonStop: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444420',
  },
  recordButtonDisabled: {
    borderColor: '#374151',
  },
  recordButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
  },
  recordButtonInnerStop: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  recordButtonLabel: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  statsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  eventsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    marginVertical: 2,
    gap: 8,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventType: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: 12,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  simulatorSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  swingButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  swingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  configSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  configLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  rateOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rateOption: {
    flex: 1,
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rateOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f620',
  },
  rateOptionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  rateOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  lastSessionSection: {
    padding: 16,
  },
});
