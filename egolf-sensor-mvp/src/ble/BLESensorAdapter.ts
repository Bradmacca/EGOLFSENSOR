/**
 * BLE Sensor Adapter
 * 
 * Adapter that bridges the BLE Manager to the Sensor Adapter interface.
 * Handles parsing of raw BLE packets into SensorSample format.
 * 
 * TODO: When WT9011DCL arrives:
 * 1. Analyze packet format from the device
 * 2. Implement parsePacket() with correct byte offsets and scaling
 * 3. Handle any device-specific initialization/configuration
 */

import { 
  BaseSensorAdapter, 
  SensorAdapterStatus, 
  SensorSampleCallback 
} from '../sensors/SensorAdapter';
import { BLEManager } from './BLEManager';
import { SensorSample } from '../types';
import { ParsedSensorPacket, WT9011DCL_CONFIG } from '../types/ble';

/**
 * BLE Sensor Adapter for WT9011DCL and similar IMU sensors
 */
export class BLESensorAdapter extends BaseSensorAdapter {
  readonly adapterType = 'ble';
  
  private dataUnsubscribe: (() => void) | null = null;
  private stateUnsubscribe: (() => void) | null = null;
  private startTime: number = 0;
  private sampleCount: number = 0;
  private lastSampleTime: number = 0;
  
  constructor() {
    super();
    
    // Subscribe to BLE state changes
    this.stateUnsubscribe = BLEManager.onStateChange((state) => {
      this.notifyStatusChange();
    });
  }
  
  getStatus(): SensorAdapterStatus {
    const bleState = BLEManager.getState();
    
    return {
      isConnected: bleState.connectionState === 'connected',
      isStreaming: this.streaming,
      sampleRate: this.currentSampleRate,
      deviceId: bleState.connectedDevice?.id || 'none',
      deviceName: bleState.connectedDevice?.name || 'No Device',
      signalQuality: bleState.signalQuality,
      error: bleState.error || undefined,
    };
  }
  
  /**
   * Start streaming data from the BLE device
   */
  async startStreaming(
    onSample: SensorSampleCallback,
    targetRateHz: number = 100
  ): Promise<void> {
    const bleState = BLEManager.getState();
    
    if (bleState.connectionState !== 'connected') {
      throw new Error('BLE device not connected');
    }
    
    if (this.streaming) {
      return;
    }
    
    this.sampleCallback = onSample;
    this.startTime = Date.now();
    this.sampleCount = 0;
    this.lastSampleTime = 0;
    this.streaming = true;
    
    // Subscribe to BLE data notifications
    this.dataUnsubscribe = BLEManager.onData((data) => {
      this.handleBLEData(data);
    });
    
    // Update sample rate periodically
    const rateInterval = setInterval(() => {
      if (!this.streaming) {
        clearInterval(rateInterval);
        return;
      }
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.currentSampleRate = elapsed > 0 ? this.sampleCount / elapsed : 0;
    }, 500);
    
    (this as any)._rateInterval = rateInterval;
    
    this.notifyStatusChange();
  }
  
  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.streaming) {
      return;
    }
    
    if (this.dataUnsubscribe) {
      this.dataUnsubscribe();
      this.dataUnsubscribe = null;
    }
    
    if ((this as any)._rateInterval) {
      clearInterval((this as any)._rateInterval);
      (this as any)._rateInterval = null;
    }
    
    this.streaming = false;
    this.currentSampleRate = 0;
    this.notifyStatusChange();
  }
  
  /**
   * Handle incoming BLE data packet
   */
  private handleBLEData(data: Uint8Array): void {
    const now = Date.now();
    const timestampMs = now - this.startTime;
    
    // Parse the packet
    const parsed = this.parsePacket(data);
    
    if (!parsed.valid) {
      console.warn('[BLESensor] Invalid packet received');
      return;
    }
    
    // Create sensor sample
    const sample: SensorSample = {
      timestampMs,
      quat: parsed.quat,
      euler: parsed.euler,
      accel: parsed.accel || { x: 0, y: 0, z: 0 },
      gyro: parsed.gyro || { x: 0, y: 0, z: 0 },
      mag: parsed.mag || { x: 0, y: 0, z: 0 },
    };
    
    this.sampleCount++;
    this.lastSampleTime = now;
    this.emitSample(sample);
  }
  
  /**
   * Parse raw BLE packet into sensor data
   * 
   * TODO: WT9011DCL PACKET PARSING
   * 
   * When the WT9011DCL device arrives, implement the actual packet parsing here.
   * 
   * Common WIT Motion packet formats:
   * - Header byte(s) identifying packet type
   * - 2-byte signed integers for each axis (little-endian)
   * - Scaling factors differ by sensor type:
   *   - Accelerometer: raw / 32768.0 * 16.0 (for ±16g range)
   *   - Gyroscope: raw / 32768.0 * 2000.0 (for ±2000°/s range)
   *   - Magnetometer: raw (units depend on sensor)
   *   - Quaternion: raw / 32768.0
   * 
   * Example WT901 packet structure (may differ for WT9011DCL):
   * - Byte 0: 0x55 (header)
   * - Byte 1: Packet type (0x51=accel, 0x52=gyro, 0x53=angle, 0x54=mag, 0x59=quat)
   * - Bytes 2-7: 3x int16 data
   * - Byte 8: Checksum
   * 
   * Reference: WIT Motion protocol documentation
   */
  private parsePacket(data: Uint8Array): ParsedSensorPacket {
    // Placeholder implementation - returns stub data
    // TODO: Replace with actual parsing when device arrives
    
    if (data.length < 2) {
      return { valid: false };
    }
    
    // For now, return stub data to allow testing the data flow
    // This will be replaced with real parsing
    
    console.log('[BLESensor] Received packet, length:', data.length, 
      'first bytes:', Array.from(data.slice(0, 5)).map(b => b.toString(16)).join(' '));
    
    // Return placeholder data
    return {
      valid: true,
      accel: { x: 0, y: 0, z: 1 },
      gyro: { x: 0, y: 0, z: 0 },
      mag: { x: 20, y: 5, z: 40 },
      euler: { roll: 0, pitch: 0, yaw: 0 },
    };
  }
  
  /**
   * Helper to read int16 from buffer (little-endian)
   */
  private readInt16LE(data: Uint8Array, offset: number): number {
    const val = data[offset] | (data[offset + 1] << 8);
    return val > 32767 ? val - 65536 : val;
  }
  
  dispose(): void {
    this.stopStreaming();
    
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
      this.stateUnsubscribe = null;
    }
    
    super.dispose();
  }
}
