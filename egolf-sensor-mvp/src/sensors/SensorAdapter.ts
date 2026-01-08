/**
 * Sensor Adapter Interface
 * 
 * This defines the contract for sensor data providers.
 * Both real BLE sensors and simulated sensors implement this interface.
 * 
 * TODO: When WT9011DCL arrives, implement BLESensorAdapter that:
 * 1. Connects to the device via BLE
 * 2. Subscribes to data notifications
 * 3. Parses incoming packets to SensorSample format
 * 4. Emits samples through the callback
 */

import { SensorSample } from '../types';

/**
 * Callback type for receiving sensor samples
 */
export type SensorSampleCallback = (sample: SensorSample) => void;

/**
 * Callback type for adapter status changes
 */
export type SensorStatusCallback = (status: SensorAdapterStatus) => void;

/**
 * Sensor adapter status
 */
export interface SensorAdapterStatus {
  isConnected: boolean;
  isStreaming: boolean;
  sampleRate: number;
  deviceId: string;
  deviceName: string;
  signalQuality: number; // 0-100
  error?: string;
}

/**
 * Sensor Adapter Interface
 * 
 * Implement this interface for each sensor type (BLE, simulated, etc.)
 */
export interface ISensorAdapter {
  /** Unique identifier for this adapter type */
  readonly adapterType: string;
  
  /** Current status */
  getStatus(): SensorAdapterStatus;
  
  /** Start streaming sensor data */
  startStreaming(
    onSample: SensorSampleCallback,
    targetRateHz?: number
  ): Promise<void>;
  
  /** Stop streaming */
  stopStreaming(): Promise<void>;
  
  /** Check if currently streaming */
  isStreaming(): boolean;
  
  /** Subscribe to status changes */
  onStatusChange(callback: SensorStatusCallback): () => void;
  
  /** Clean up resources */
  dispose(): void;
}

/**
 * Base class with common functionality for sensor adapters
 */
export abstract class BaseSensorAdapter implements ISensorAdapter {
  abstract readonly adapterType: string;
  
  protected statusListeners: Set<SensorStatusCallback> = new Set();
  protected streaming: boolean = false;
  protected currentSampleRate: number = 0;
  protected sampleCallback: SensorSampleCallback | null = null;
  
  abstract getStatus(): SensorAdapterStatus;
  abstract startStreaming(onSample: SensorSampleCallback, targetRateHz?: number): Promise<void>;
  abstract stopStreaming(): Promise<void>;
  
  isStreaming(): boolean {
    return this.streaming;
  }
  
  onStatusChange(callback: SensorStatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }
  
  protected notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(cb => cb(status));
  }
  
  protected emitSample(sample: SensorSample): void {
    if (this.sampleCallback) {
      this.sampleCallback(sample);
    }
  }
  
  dispose(): void {
    this.statusListeners.clear();
    this.sampleCallback = null;
  }
}
