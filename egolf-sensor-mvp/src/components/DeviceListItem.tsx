/**
 * Device List Item Component
 * 
 * Displays a discovered BLE device with RSSI indicator.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DiscoveredDevice } from '../types/ble';

interface DeviceListItemProps {
  device: DiscoveredDevice;
  onPress: () => void;
  isConnected?: boolean;
  isConnecting?: boolean;
}

export function DeviceListItem({ 
  device, 
  onPress, 
  isConnected = false,
  isConnecting = false,
}: DeviceListItemProps): React.JSX.Element {
  const rssi = device.rssi || -100;
  const signalBars = getSignalBars(rssi);
  
  return (
    <TouchableOpacity 
      style={[styles.container, isConnected && styles.containerConnected]}
      onPress={onPress}
      disabled={isConnecting}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {device.name || 'Unknown Device'}
        </Text>
        <Text style={styles.id} numberOfLines={1}>
          {device.id}
        </Text>
      </View>
      
      <View style={styles.signal}>
        <View style={styles.signalBars}>
          {[1, 2, 3, 4].map(level => (
            <View 
              key={level}
              style={[
                styles.signalBar,
                { height: 4 + level * 4 },
                level <= signalBars ? styles.signalBarActive : styles.signalBarInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.rssi}>{rssi} dBm</Text>
      </View>
      
      {isConnected && (
        <View style={styles.connectedBadge}>
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      )}
      
      {isConnecting && (
        <View style={styles.connectingBadge}>
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getSignalBars(rssi: number): number {
  if (rssi >= -50) return 4;
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  containerConnected: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  id: {
    fontSize: 12,
    color: '#6b7280',
  },
  signal: {
    alignItems: 'center',
    marginLeft: 16,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  signalBarActive: {
    backgroundColor: '#22c55e',
  },
  signalBarInactive: {
    backgroundColor: '#374151',
  },
  rssi: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  connectedBadge: {
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  connectedText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  connectingBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  connectingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
