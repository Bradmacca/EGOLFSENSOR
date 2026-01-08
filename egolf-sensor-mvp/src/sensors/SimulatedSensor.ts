/**
 * Simulated Sensor Adapter
 * 
 * Generates realistic-looking sensor data for testing the app
 * without real hardware. Simulates golf swing motion patterns.
 */

import {
  BaseSensorAdapter,
  SensorAdapterStatus,
  SensorSampleCallback,
} from './SensorAdapter';
import { SensorSample, Quaternion, EulerAngles, Vector3 } from '../types';
import { quaternionToEuler, normalizeQuaternion } from '../utils/math';

/**
 * Simulated sensor configuration
 */
interface SimulationConfig {
  /** Add noise to make data more realistic */
  noiseLevel: number;
  /** Simulate occasional signal quality drops */
  simulateSignalDrops: boolean;
  /** Whether to simulate swing patterns or idle */
  swingMode: 'idle' | 'continuous' | 'periodic';
  /** Period between swings in periodic mode (ms) */
  swingPeriodMs: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  noiseLevel: 0.05,
  simulateSignalDrops: false,
  swingMode: 'idle',
  swingPeriodMs: 5000,
};

/**
 * Simulated Sensor that generates realistic golf swing data
 */
export class SimulatedSensor extends BaseSensorAdapter {
  readonly adapterType = 'simulated';
  
  private config: SimulationConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private sampleCount: number = 0;
  private targetRateHz: number = 100;
  
  // Simulation state
  private baseEuler: EulerAngles = { roll: 0, pitch: 0, yaw: 0 };
  private swingPhase: number = 0; // 0 = idle, 1 = backswing, 2 = downswing, 3 = follow-through
  private swingStartTime: number = 0;
  private lastSwingTime: number = 0;
  
  constructor(config: Partial<SimulationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  getStatus(): SensorAdapterStatus {
    return {
      isConnected: true, // Simulated is always "connected"
      isStreaming: this.streaming,
      sampleRate: this.currentSampleRate,
      deviceId: 'simulated-sensor',
      deviceName: 'Simulated WT9011DCL',
      signalQuality: this.streaming ? 95 : 0,
    };
  }
  
  async startStreaming(
    onSample: SensorSampleCallback,
    targetRateHz: number = 100
  ): Promise<void> {
    if (this.streaming) {
      return;
    }
    
    this.sampleCallback = onSample;
    this.targetRateHz = Math.min(targetRateHz, 200); // Cap at 200Hz
    this.startTime = Date.now();
    this.sampleCount = 0;
    this.streaming = true;
    this.swingPhase = 0;
    this.lastSwingTime = 0;
    
    // Reset base orientation
    this.baseEuler = { roll: 0, pitch: 0, yaw: 0 };
    
    // Calculate interval in ms
    const intervalMs = 1000 / this.targetRateHz;
    
    // Use setInterval for consistent timing
    // In production, this might need high-resolution timers
    this.intervalId = setInterval(() => {
      this.generateSample();
    }, intervalMs);
    
    // Update sample rate tracking periodically
    const rateTracker = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.currentSampleRate = elapsed > 0 ? this.sampleCount / elapsed : 0;
    }, 500);
    
    // Store the rate tracker to clean up later
    (this as any)._rateTracker = rateTracker;
    
    this.notifyStatusChange();
  }
  
  async stopStreaming(): Promise<void> {
    if (!this.streaming) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if ((this as any)._rateTracker) {
      clearInterval((this as any)._rateTracker);
      (this as any)._rateTracker = null;
    }
    
    this.streaming = false;
    this.currentSampleRate = 0;
    this.notifyStatusChange();
  }
  
  /**
   * Generate a single simulated sample
   */
  private generateSample(): void {
    const now = Date.now();
    const timestampMs = now - this.startTime;
    
    // Update swing simulation
    this.updateSwingSimulation(now);
    
    // Generate sensor data based on current state
    const euler = this.getCurrentEuler(timestampMs);
    const quat = this.eulerToQuat(euler);
    const gyro = this.getCurrentGyro(timestampMs);
    const accel = this.getCurrentAccel(timestampMs);
    const mag = this.getCurrentMag();
    
    // Add noise
    this.addNoise(euler);
    this.addNoise(gyro);
    this.addNoise(accel);
    
    const sample: SensorSample = {
      timestampMs,
      quat,
      euler,
      accel,
      gyro,
      mag,
    };
    
    this.sampleCount++;
    this.emitSample(sample);
  }
  
  /**
   * Update swing simulation state machine
   */
  private updateSwingSimulation(now: number): void {
    if (this.config.swingMode === 'idle') {
      this.swingPhase = 0;
      return;
    }
    
    if (this.config.swingMode === 'periodic') {
      // Start a new swing periodically
      if (now - this.lastSwingTime > this.config.swingPeriodMs && this.swingPhase === 0) {
        this.swingPhase = 1;
        this.swingStartTime = now;
        this.lastSwingTime = now;
      }
    } else if (this.config.swingMode === 'continuous') {
      // Continuously cycling through swings
      if (this.swingPhase === 0) {
        this.swingPhase = 1;
        this.swingStartTime = now;
      }
    }
    
    // Progress through swing phases
    if (this.swingPhase > 0) {
      const swingTime = now - this.swingStartTime;
      
      if (swingTime < 800) {
        this.swingPhase = 1; // Backswing (0-800ms)
      } else if (swingTime < 1100) {
        this.swingPhase = 2; // Downswing (800-1100ms) - fast!
      } else if (swingTime < 1600) {
        this.swingPhase = 3; // Follow-through (1100-1600ms)
      } else {
        this.swingPhase = 0; // Back to idle
      }
    }
  }
  
  /**
   * Get current euler angles based on simulation state
   */
  private getCurrentEuler(timestampMs: number): EulerAngles {
    let roll = this.baseEuler.roll;
    let pitch = this.baseEuler.pitch;
    let yaw = this.baseEuler.yaw;
    
    // Add subtle idle motion (breathing, micro-movements)
    const idleRoll = Math.sin(timestampMs * 0.001) * 2;
    const idlePitch = Math.cos(timestampMs * 0.0015) * 1.5;
    
    if (this.swingPhase === 0) {
      // Idle - just subtle movements
      roll = idleRoll;
      pitch = idlePitch;
      yaw = Math.sin(timestampMs * 0.0008) * 1;
    } else {
      const swingTime = Date.now() - this.swingStartTime;
      
      if (this.swingPhase === 1) {
        // Backswing - wrist cocks (roll increases), club goes back (yaw changes)
        const progress = Math.min(swingTime / 800, 1);
        const eased = this.easeInOutCubic(progress);
        roll = eased * 45; // Wrist cock
        pitch = eased * -15; // Slight radial deviation
        yaw = eased * 90; // Club going back
      } else if (this.swingPhase === 2) {
        // Downswing - rapid unwinding
        const progress = Math.min((swingTime - 800) / 300, 1);
        const eased = this.easeOutQuad(progress);
        roll = 45 - eased * 60; // Wrist release (goes negative = bowed)
        pitch = -15 + eased * 20;
        yaw = 90 - eased * 120; // Rapid rotation through impact
      } else if (this.swingPhase === 3) {
        // Follow-through
        const progress = Math.min((swingTime - 1100) / 500, 1);
        const eased = this.easeOutCubic(progress);
        roll = -15 + eased * 20; // Returns toward neutral
        pitch = 5 + eased * -5;
        yaw = -30 + eased * 30; // Continues around
      }
    }
    
    return { roll, pitch, yaw };
  }
  
  /**
   * Get current gyroscope readings based on simulation state
   */
  private getCurrentGyro(timestampMs: number): Vector3 {
    let x = 0, y = 0, z = 0;
    
    if (this.swingPhase === 0) {
      // Idle - very low gyro readings
      x = Math.sin(timestampMs * 0.003) * 10;
      y = Math.cos(timestampMs * 0.004) * 8;
      z = Math.sin(timestampMs * 0.002) * 5;
    } else {
      const swingTime = Date.now() - this.swingStartTime;
      
      if (this.swingPhase === 1) {
        // Backswing - moderate rotation rates
        const progress = swingTime / 800;
        x = Math.sin(progress * Math.PI) * 150; // Roll rate
        y = Math.sin(progress * Math.PI) * 80;
        z = Math.sin(progress * Math.PI) * 200; // Yaw rate
      } else if (this.swingPhase === 2) {
        // Downswing - HIGH rotation rates (this is where the speed is!)
        const progress = (swingTime - 800) / 300;
        // Peak gyro at impact (end of downswing)
        const intensity = Math.sin(progress * Math.PI);
        x = -intensity * 800; // Wrist uncocking
        y = intensity * 200;
        z = -intensity * 1500; // Club rotating through (very fast!)
      } else if (this.swingPhase === 3) {
        // Follow-through - decelerating
        const progress = (swingTime - 1100) / 500;
        const decay = 1 - this.easeOutCubic(progress);
        x = decay * -100;
        y = decay * 50;
        z = decay * -300;
      }
    }
    
    return { x, y, z };
  }
  
  /**
   * Get current accelerometer readings
   */
  private getCurrentAccel(timestampMs: number): Vector3 {
    // Base gravity (sensor at rest pointing down-ish)
    let x = 0.1;
    let y = 0.1;
    let z = 1.0; // ~1g downward
    
    if (this.swingPhase === 2) {
      // Downswing has high centripetal acceleration
      const swingTime = Date.now() - this.swingStartTime;
      const progress = (swingTime - 800) / 300;
      const intensity = Math.sin(progress * Math.PI);
      
      // Club head experiences high g-forces
      x += intensity * 5;
      y += intensity * 2;
      z += intensity * 8; // Can be 10+ g's at impact
    } else if (this.swingPhase === 1) {
      // Backswing has lower acceleration
      x += Math.sin(timestampMs * 0.01) * 0.5;
      y += Math.cos(timestampMs * 0.01) * 0.3;
    }
    
    return { x, y, z };
  }
  
  /**
   * Get magnetometer readings (relatively stable)
   */
  private getCurrentMag(): Vector3 {
    // Simulate earth's magnetic field (~25-65 μT)
    // Values change slightly with orientation
    return {
      x: 20 + Math.sin(this.baseEuler.yaw * Math.PI / 180) * 10,
      y: 5 + Math.cos(this.baseEuler.yaw * Math.PI / 180) * 5,
      z: 40 + Math.sin(this.baseEuler.pitch * Math.PI / 180) * 5,
    };
  }
  
  /**
   * Convert euler to quaternion (simple implementation)
   */
  private eulerToQuat(euler: EulerAngles): Quaternion {
    const { roll, pitch, yaw } = euler;
    const r = roll * (Math.PI / 180) / 2;
    const p = pitch * (Math.PI / 180) / 2;
    const y = yaw * (Math.PI / 180) / 2;
    
    const cr = Math.cos(r), sr = Math.sin(r);
    const cp = Math.cos(p), sp = Math.sin(p);
    const cy = Math.cos(y), sy = Math.sin(y);
    
    return normalizeQuaternion({
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy,
    });
  }
  
  /**
   * Add noise to a vector or euler angles
   */
  private addNoise(v: Vector3 | EulerAngles): void {
    const noise = this.config.noiseLevel;
    if ('x' in v && 'y' in v && 'z' in v) {
      v.x += (Math.random() - 0.5) * noise * 10;
      v.y += (Math.random() - 0.5) * noise * 10;
      v.z += (Math.random() - 0.5) * noise * 10;
    }
    if ('roll' in v) {
      v.roll += (Math.random() - 0.5) * noise * 5;
      v.pitch += (Math.random() - 0.5) * noise * 5;
      v.yaw += (Math.random() - 0.5) * noise * 5;
    }
  }
  
  // Easing functions for smooth animation
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
  
  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
  
  /**
   * Set swing simulation mode
   */
  setSwingMode(mode: SimulationConfig['swingMode']): void {
    this.config.swingMode = mode;
    if (mode !== 'idle') {
      this.lastSwingTime = 0; // Reset to trigger immediate swing
    }
  }
  
  /**
   * Trigger a single swing (useful for testing)
   */
  triggerSwing(): void {
    if (this.swingPhase === 0) {
      this.swingPhase = 1;
      this.swingStartTime = Date.now();
    }
  }
  
  dispose(): void {
    this.stopStreaming();
    super.dispose();
  }
}
