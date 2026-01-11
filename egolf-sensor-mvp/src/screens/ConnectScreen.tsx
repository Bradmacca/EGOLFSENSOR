/**
 * Connect Screen
 * 
 * Handles BLE device scanning, connection, and simulated sensor toggle.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSensor } from '../context';
import { BLEManager } from '../ble/BLEManager';
import { DeviceListItem } from '../components/DeviceListItem';
import { StatusChip } from '../components/StatusChip';
import { PlacementGuideModal } from '../components/PlacementGuideModal';
import { DiscoveredDevice } from '../types/ble';

export function ConnectScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {
    isUsingSimulator,
    setUseSimulator,
    bleState,
    sensorStatus,
    impactNeutralBaseline,
  } = useSensor();
  
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showPlacementGuide, setShowPlacementGuide] = useState(false);
  
  // Start BLE scan
  const handleStartScan = useCallback(async () => {
    try {
      await BLEManager.startScan(false); // false = show all devices for debugging
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Scan Error', 'Failed to start BLE scan. Check permissions.');
    }
  }, []);
  
  // Stop BLE scan
  const handleStopScan = useCallback(() => {
    BLEManager.stopScan();
  }, []);
  
  // Connect to device
  const handleConnect = useCallback(async (device: DiscoveredDevice) => {
    setIsConnecting(device.id);
    try {
      const success = await BLEManager.connect(device.id);
      if (success) {
        // Auto-switch to BLE mode when connected
        setUseSimulator(false);
      } else {
        Alert.alert('Connection Failed', 'Could not connect to device.');
      }
    } catch (error: any) {
      Alert.alert('Connection Error', error.message || 'Unknown error');
    } finally {
      setIsConnecting(null);
    }
  }, [setUseSimulator]);
  
  // Disconnect
  const handleDisconnect = useCallback(async () => {
    await BLEManager.disconnect();
  }, []);
  
  // Toggle simulator
  const handleToggleSimulator = useCallback((value: boolean) => {
    setUseSimulator(value);
  }, [setUseSimulator]);
  
  const renderDevice = useCallback(({ item }: { item: DiscoveredDevice }) => (
    <DeviceListItem
      device={item}
      onPress={() => handleConnect(item)}
      isConnected={bleState.connectedDevice?.id === item.id}
      isConnecting={isConnecting === item.id}
    />
  ), [handleConnect, bleState.connectedDevice, isConnecting]);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Connect Sensor</Text>
        <View style={styles.statusRow}>
          <StatusChip
            label={isUsingSimulator ? 'Simulated' : 'BLE'}
            status={isUsingSimulator || bleState.connectionState === 'connected' ? 'active' : 'inactive'}
            size="small"
          />
          {sensorStatus.isStreaming && (
            <StatusChip
              label="Streaming"
              status="active"
              size="small"
            />
          )}
        </View>
      </View>
      
      {/* Simulator Toggle */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Use Simulated Sensor</Text>
            <Text style={styles.toggleDescription}>
              Test the app without real hardware
            </Text>
          </View>
          <Switch
            value={isUsingSimulator}
            onValueChange={handleToggleSimulator}
            trackColor={{ false: '#374151', true: '#22c55e80' }}
            thumbColor={isUsingSimulator ? '#22c55e' : '#9ca3af'}
          />
        </View>
        
        {isUsingSimulator && (
          <View style={styles.simulatorInfo}>
            <Text style={styles.simulatorInfoText}>
              ✓ Simulated sensor is ready. Go to Live screen to start streaming.
            </Text>
          </View>
        )}
      </View>
      
      {/* BLE Section */}
      {!isUsingSimulator && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bluetooth Devices</Text>
          
          {/* Connected Device */}
          {bleState.connectedDevice && (
            <View style={styles.connectedDevice}>
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedLabel}>Connected to:</Text>
                <Text style={styles.connectedName}>
                  {bleState.connectedDevice.name}
                </Text>
                <Text style={styles.signalText}>
                  Signal: {bleState.signalQuality}%
                </Text>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Scan Controls */}
          {!bleState.connectedDevice && (
            <>
              <View style={styles.scanControls}>
                {bleState.isScanning ? (
                  <TouchableOpacity
                    style={[styles.scanButton, styles.scanButtonStop]}
                    onPress={handleStopScan}
                  >
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.scanButtonText}>Stop Scan</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={handleStartScan}
                  >
                    <Text style={styles.scanButtonText}>Scan for Devices</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Error Display */}
              {bleState.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{bleState.error}</Text>
                </View>
              )}
              
              {/* Device List */}
              <FlatList
                data={bleState.discoveredDevices}
                renderItem={renderDevice}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                contentContainerStyle={styles.deviceListContent}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>
                      {bleState.isScanning
                        ? 'Scanning for devices...'
                        : 'No devices found. Tap "Scan" to search.'}
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </View>
      )}
      
      {/* Placement Guide Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Placement Guide</Text>
          <TouchableOpacity
            onPress={() => setShowPlacementGuide(true)}
            style={styles.helpButton}
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.placementGuideText}>
          Learn how to properly attach the sensor to your lead wrist/forearm for accurate readings.
        </Text>
        <TouchableOpacity
          style={styles.placementGuideButton}
          onPress={() => setShowPlacementGuide(true)}
        >
          <Text style={styles.placementGuideButtonText}>View Placement Guide</Text>
        </TouchableOpacity>
      </View>

      {/* Calibration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impact Neutral Calibration</Text>
        
        {impactNeutralBaseline ? (
          <View style={styles.calibrationStatus}>
            <StatusChip label="Calibrated" status="active" size="small" />
            <Text style={styles.calibrationDate}>
              Set your target impact wrist position
            </Text>
          </View>
        ) : (
          <View style={styles.calibrationWarning}>
            <Text style={styles.calibrationWarningText}>
              ⚠️ Not calibrated. Set your target impact position for wrist error metrics.
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.calibrateButton}
          onPress={() => (navigation as any).navigate('Calibration')}
        >
          <Text style={styles.calibrateButtonText}>
            {impactNeutralBaseline ? 'Recalibrate' : 'Calibrate Now'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Supported Devices</Text>
        <Text style={styles.helpText}>
          • WT9011DCL / WT901BLE IMU sensors{'\n'}
          • Other WIT Motion BLE sensors{'\n'}
          • HC-06 Bluetooth modules
        </Text>
        <Text style={styles.helpNote}>
          TODO: WT9011DCL BLE UUIDs + packet parsing will be added when device arrives.
        </Text>
      </View>

      {/* Placement Guide Modal */}
      <PlacementGuideModal
        visible={showPlacementGuide}
        onClose={() => setShowPlacementGuide(false)}
      />
    </SafeAreaView>
  );
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
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placementGuideText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    lineHeight: 20,
  },
  placementGuideButton: {
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  placementGuideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  simulatorInfo: {
    backgroundColor: '#22c55e20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  simulatorInfoText: {
    fontSize: 14,
    color: '#22c55e',
  },
  connectedDevice: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  connectedInfo: {
    marginBottom: 12,
  },
  connectedLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  connectedName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  signalText: {
    fontSize: 14,
    color: '#22c55e',
    marginTop: 4,
  },
  disconnectButton: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  scanControls: {
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonStop: {
    backgroundColor: '#f59e0b',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceListContent: {
    gap: 8,
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  helpSection: {
    padding: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  helpNote: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 12,
    fontStyle: 'italic',
  },
  calibrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  calibrationDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  calibrationWarning: {
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  calibrationWarningText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  calibrateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  calibrateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
