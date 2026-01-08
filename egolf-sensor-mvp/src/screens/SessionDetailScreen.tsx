/**
 * Session Detail Screen
 * 
 * Detailed view of a recorded session with charts, events, and export options.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { loadSession, shareSession, deleteSession } from '../storage/SessionStorage';
import { Session, SwingEvent } from '../types';
import { formatDate, formatDuration } from '../utils/math';
import { GyroChart } from '../components/GyroChart';
import { MetricRow } from '../components/MetricRow';
import { StatusChip } from '../components/StatusChip';

type RouteParams = {
  SessionDetail: { sessionId: string };
};

export function SessionDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'SessionDetail'>>();
  const { sessionId } = route.params;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Load session data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await loadSession(sessionId);
      setSession(data);
      setLoading(false);
    }
    load();
  }, [sessionId]);
  
  // Export handlers
  const handleExportCSV = useCallback(async () => {
    if (!session) return;
    setExporting(true);
    try {
      await shareSession(sessionId, 'csv');
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [session, sessionId]);
  
  const handleExportJSONL = useCallback(async () => {
    if (!session) return;
    setExporting(true);
    try {
      await shareSession(sessionId, 'jsonl');
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export JSONL');
    } finally {
      setExporting(false);
    }
  }, [session, sessionId]);
  
  // Delete handler
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [sessionId, navigation]);
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const { metadata, samples } = session;
  
  // Calculate additional metrics
  const startEvent = metadata.events.find(e => e.type === 'start');
  const topEvent = metadata.events.find(e => e.type === 'top');
  const impactEvent = metadata.events.find(e => e.type === 'impact');
  
  const backswingDuration = startEvent && topEvent 
    ? topEvent.timestampMs - startEvent.timestampMs 
    : null;
  const downswingDuration = topEvent && impactEvent
    ? impactEvent.timestampMs - topEvent.timestampMs
    : null;
  const tempoRatio = backswingDuration && downswingDuration
    ? backswingDuration / downswingDuration
    : null;
  
  // Get wrist angles at events (placeholder - using roll from samples)
  const getWristAngleAtTime = (timestampMs: number): number | null => {
    const sample = samples.find(s => Math.abs(s.timestampMs - timestampMs) < 20);
    return sample?.euler?.roll ?? null;
  };
  
  const wristAtTop = topEvent ? getWristAngleAtTime(topEvent.timestampMs) : null;
  const wristAtImpact = impactEvent ? getWristAngleAtTime(impactEvent.timestampMs) : null;
  const wristChange = wristAtTop !== null && wristAtImpact !== null
    ? wristAtImpact - wristAtTop
    : null;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backNav}>
            <Text style={styles.backNavText}>← Sessions</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{metadata.name}</Text>
          <Text style={styles.date}>{formatDate(metadata.startTime)}</Text>
        </View>
        
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>
                {formatDuration(metadata.durationMs)}
              </Text>
              <Text style={styles.overviewLabel}>Duration</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{metadata.sampleCount}</Text>
              <Text style={styles.overviewLabel}>Samples</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>
                {metadata.actualSampleRate?.toFixed(0) || metadata.targetSampleRate}
              </Text>
              <Text style={styles.overviewLabel}>Hz</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewValue}>{metadata.events.length}</Text>
              <Text style={styles.overviewLabel}>Events</Text>
            </View>
          </View>
        </View>
        
        {/* Gyro Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gyro Magnitude Over Time</Text>
          <GyroChart
            samples={samples}
            events={metadata.events}
          />
        </View>
        
        {/* Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Events</Text>
          {metadata.events.length === 0 ? (
            <Text style={styles.noEvents}>No swing events detected</Text>
          ) : (
            metadata.events.map((event, idx) => (
              <View key={idx} style={styles.eventItem}>
                <View style={[styles.eventDot, { backgroundColor: getEventColor(event.type) }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventType}>{event.type}</Text>
                  <Text style={styles.eventTime}>{formatDuration(event.timestampMs)}</Text>
                </View>
                {event.data?.gyroMagnitude && (
                  <Text style={styles.eventGyro}>
                    {event.data.gyroMagnitude.toFixed(0)}°/s
                  </Text>
                )}
                {event.confidence && (
                  <StatusChip
                    label={`${(event.confidence * 100).toFixed(0)}%`}
                    status={event.confidence > 0.7 ? 'active' : 'warning'}
                    size="small"
                  />
                )}
              </View>
            ))
          )}
        </View>
        
        {/* Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swing Metrics</Text>
          
          {tempoRatio !== null ? (
            <MetricRow
              label="Tempo Ratio (Backswing:Downswing)"
              value={`${tempoRatio.toFixed(2)}:1`}
              highlight={tempoRatio >= 2.5 && tempoRatio <= 3.5}
            />
          ) : (
            <MetricRow label="Tempo Ratio" value="--" />
          )}
          
          {backswingDuration !== null ? (
            <MetricRow
              label="Backswing Duration"
              value={backswingDuration}
              unit="ms"
            />
          ) : (
            <MetricRow label="Backswing Duration" value="--" />
          )}
          
          {downswingDuration !== null ? (
            <MetricRow
              label="Downswing Duration"
              value={downswingDuration}
              unit="ms"
            />
          ) : (
            <MetricRow label="Downswing Duration" value="--" />
          )}
          
          {wristChange !== null ? (
            <MetricRow
              label="Wrist Change (Top→Impact)"
              value={wristChange.toFixed(1)}
              unit="°"
              highlight
            />
          ) : (
            <MetricRow label="Wrist Change (Top→Impact)" value="--" />
          )}
          
          {/* Placeholder metrics */}
          <View style={styles.placeholderMetrics}>
            <Text style={styles.placeholderTitle}>Placeholder Metrics</Text>
            <MetricRow label="Consistency Score" value="--" />
            <MetricRow label="Club Head Speed (proxy)" value="--" />
            <MetricRow label="Shaft Lean at Impact" value="--" />
            <Text style={styles.placeholderNote}>
              These metrics will be refined with real sensor data and analysis.
            </Text>
          </View>
        </View>
        
        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <MetricRow 
            label="Device" 
            value={metadata.deviceName || metadata.deviceId} 
          />
          <MetricRow 
            label="Type" 
            value={metadata.deviceId === 'simulated-sensor' ? 'Simulated' : 'BLE Sensor'} 
          />
          <MetricRow 
            label="Target Rate" 
            value={metadata.targetSampleRate} 
            unit="Hz"
          />
          {metadata.actualSampleRate && (
            <MetricRow 
              label="Actual Rate" 
              value={metadata.actualSampleRate.toFixed(1)} 
              unit="Hz"
            />
          )}
        </View>
        
        {/* Export Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportCSV}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.exportButtonText}>Export CSV</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportJSONL}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.exportButtonText}>Export JSONL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Session</Text>
          </TouchableOpacity>
        </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  backNav: {
    marginBottom: 12,
  },
  backNavText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  overviewItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  noEvents: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    gap: 12,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  eventTime: {
    fontSize: 12,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  eventGyro: {
    fontSize: 12,
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },
  placeholderMetrics: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  placeholderTitle: {
    fontSize: 12,
    color: '#f59e0b',
    marginBottom: 8,
  },
  placeholderNote: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteSection: {
    padding: 16,
  },
  deleteButton: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
