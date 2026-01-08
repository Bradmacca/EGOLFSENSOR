/**
 * BLE-related types for eGolf Sensor MVP
 */

import { Device } from 'react-native-ble-plx';

/**
 * BLE connection states
 */
export type BLEConnectionState = 
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

/**
 * Discovered BLE device info
 */
export interface DiscoveredDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  /** Raw device object from BLE library */
  device: Device;
  /** Timestamp when discovered */
  discoveredAt: number;
}

/**
 * BLE Manager state
 */
export interface BLEState {
  connectionState: BLEConnectionState;
  connectedDevice: DiscoveredDevice | null;
  discoveredDevices: DiscoveredDevice[];
  isScanning: boolean;
  error: string | null;
  /** Signal quality indicator 0-100 */
  signalQuality: number;
}

/**
 * TODO: WT9011DCL BLE Configuration
 * 
 * When the WT9011DCL sensor arrives, fill in these UUIDs:
 * - Service UUID: The main BLE service exposed by the sensor
 * - Characteristic UUIDs: For notifications/reads of sensor data
 * 
 * Common patterns for IMU sensors:
 * - One notification characteristic for all sensor data
 * - Or separate characteristics for accel/gyro/mag/quat
 * 
 * Reference: WT9011DCL datasheet / BLE specification
 */
export const WT9011DCL_CONFIG = {
  // TODO: Replace with actual UUIDs from WT9011DCL documentation
  SERVICE_UUID: '0000ffe0-0000-1000-8000-00805f9b34fb', // Placeholder - common for WIT Motion
  
  CHARACTERISTICS: {
    // TODO: Replace with actual characteristic UUIDs
    DATA_NOTIFY: '0000ffe4-0000-1000-8000-00805f9b34fb', // Placeholder
  },
  
  // Device name patterns to filter during scan
  NAME_PATTERNS: ['WT9011', 'WT901', 'WIT', 'HC-06'],
  
  // Expected data packet size (bytes)
  PACKET_SIZE: 20, // Typical for BLE 4.0
};

/**
 * Parsed sensor packet from BLE
 * TODO: Implement actual parsing when device arrives
 */
export interface ParsedSensorPacket {
  valid: boolean;
  accel?: { x: number; y: number; z: number };
  gyro?: { x: number; y: number; z: number };
  mag?: { x: number; y: number; z: number };
  quat?: { w: number; x: number; y: number; z: number };
  euler?: { roll: number; pitch: number; yaw: number };
  timestamp?: number;
}
