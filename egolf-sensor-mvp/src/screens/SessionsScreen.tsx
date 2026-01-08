/**
 * Sessions Screen
 * 
 * List of recorded sessions with navigation to detail view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { listSessions, deleteSession } from '../storage/SessionStorage';
import { SessionMetadata } from '../types';
import { formatDate, formatDuration } from '../utils/math';

export function SessionsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load sessions
  const loadSessions = useCallback(async () => {
    const loaded = await listSessions();
    setSessions(loaded);
  }, []);
  
  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);
  
  // Navigate to detail
  const handleSessionPress = useCallback((session: SessionMetadata) => {
    (navigation as any).navigate('SessionDetail', { sessionId: session.id });
  }, [navigation]);
  
  // Delete session
  const handleDeleteSession = useCallback((session: SessionMetadata) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${session.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            await loadSessions();
          },
        },
      ]
    );
  }, [loadSessions]);
  
  const renderSession = useCallback(({ item }: { item: SessionMetadata }) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => handleSessionPress(item)}
      onLongPress={() => handleDeleteSession(item)}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.sessionDate}>
          {formatDate(item.startTime)}
        </Text>
      </View>
      
      <View style={styles.sessionStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(item.durationMs)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.sampleCount}</Text>
          <Text style={styles.statLabel}>Samples</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.events.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {item.actualSampleRate?.toFixed(0) || item.targetSampleRate}
          </Text>
          <Text style={styles.statLabel}>Hz</Text>
        </View>
      </View>
      
      {item.events.length > 0 && (
        <View style={styles.eventsPreview}>
          {item.events.slice(0, 4).map((event, idx) => (
            <View 
              key={idx} 
              style={[styles.eventDot, { backgroundColor: getEventColor(event.type) }]}
            />
          ))}
          {item.events.length > 4 && (
            <Text style={styles.moreEvents}>+{item.events.length - 4}</Text>
          )}
        </View>
      )}
      
      <Text style={styles.deviceId}>
        {item.deviceId === 'simulated-sensor' ? '🎮 Simulated' : `📡 ${item.deviceName || item.deviceId}`}
      </Text>
    </TouchableOpacity>
  ), [handleSessionPress, handleDeleteSession]);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
        <Text style={styles.subtitle}>
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} recorded
        </Text>
      </View>
      
      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#9ca3af"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sessions recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Go to the Record tab to start recording swing data.
            </Text>
          </View>
        }
      />
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  sessionItem: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  sessionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  eventsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreEvents: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
