/**
 * Core sensor data types for eGolf Sensor MVP
 */

/**
 * Quaternion representation for 3D orientation
 */
export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Euler angles representation (in degrees)
 */
export interface EulerAngles {
  roll: number;   // Rotation around X-axis (wrist flexion/extension in golf context)
  pitch: number;  // Rotation around Y-axis (wrist ulnar/radial deviation)
  yaw: number;    // Rotation around Z-axis (forearm rotation)
}

/**
 * 3D Vector for accelerometer, gyroscope, magnetometer
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Single sensor sample at a point in time
 * This is the core data unit stored during recording
 */
export interface SensorSample {
  /** Timestamp in milliseconds since recording started */
  timestampMs: number;
  
  /** Quaternion orientation (preferred if available from sensor) */
  quat?: Quaternion;
  
  /** Euler angles (used if quaternion not available, or derived from quat) */
  euler?: EulerAngles;
  
  /** Accelerometer reading in g's (typically ±16g range) */
  accel: Vector3;
  
  /** Gyroscope reading in degrees/second (typically ±2000°/s range) */
  gyro: Vector3;
  
  /** Magnetometer reading in μT (microtesla) */
  mag: Vector3;
}

/**
 * Detected swing event types
 */
export type SwingEventType = 'address' | 'start' | 'top' | 'impact' | 'finish';

/**
 * A detected event during a swing
 */
export interface SwingEvent {
  type: SwingEventType;
  timestampMs: number;
  /** Optional confidence score 0-1 */
  confidence?: number;
  /** Optional additional data about the event */
  data?: {
    gyroMagnitude?: number;
    wristAngle?: number;
    /** Wrist error vs calibrated impact neutral baseline (degrees) */
    wristError?: number;
    /** Quaternion at this event */
    quat?: Quaternion;
    /** Euler angles at this event */
    euler?: EulerAngles;
  };
}

/**
 * Session metadata stored alongside sample data
 */
export interface SessionMetadata {
  /** Unique session ID (UUID) */
  id: string;
  
  /** User-provided or auto-generated name */
  name: string;
  
  /** ISO timestamp when recording started */
  startTime: string;
  
  /** ISO timestamp when recording ended */
  endTime?: string;
  
  /** Duration in milliseconds */
  durationMs: number;
  
  /** Total number of samples recorded */
  sampleCount: number;
  
  /** Target sample rate in Hz */
  targetSampleRate: number;
  
  /** Actual achieved sample rate in Hz */
  actualSampleRate?: number;
  
  /** Device identifier (BLE device ID or 'simulated') */
  deviceId: string;
  
  /** Device name if available */
  deviceName?: string;
  
  /** Detected swing events */
  events: SwingEvent[];
  
  /** Computed metrics (placeholders for now) */
  metrics?: SessionMetrics;
  
  /** Any notes or tags */
  notes?: string;
  tags?: string[];
}

/**
 * Computed session metrics (placeholders - to be refined with real data)
 */
export interface SessionMetrics {
  /** Tempo ratio: backswing time / downswing time */
  tempoRatio?: number;
  
  /** Wrist angle change from Top to Impact (proxy metric) */
  wristChangeTopToImpact?: number;
  
  /** Consistency score 0-100 (placeholder) */
  consistencyScore?: number;
  
  /** Peak gyro magnitude during swing */
  peakGyroMagnitude?: number;
  
  /** Backswing duration in ms */
  backswingDurationMs?: number;
  
  /** Downswing duration in ms */
  downswingDurationMs?: number;
  
  // === Impact Neutral Calibration Metrics ===
  
  /** Wrist error at Top of backswing (degrees from calibrated baseline) */
  wristErrorAtTop?: number;
  
  /** Wrist error at Impact (degrees from calibrated baseline) */
  wristErrorAtImpact?: number;
  
  /** Rating of impact position: Great/OK/Off */
  impactNeutralRating?: string;
  
  /** Whether user held flexion from Top to Impact: Held/Released */
  holdFlexionStatus?: string;
  
  /** Change in wrist error from Top to Impact (negative = improved) */
  wristErrorChange?: number;
}

/**
 * Full session including metadata and samples
 */
export interface Session {
  metadata: SessionMetadata;
  samples: SensorSample[];
}

/**
 * Recording configuration
 */
export interface RecordingConfig {
  /** Target sample rate in Hz (default 100, max 200) */
  targetSampleRate: number;
  
  /** Auto-stop after N seconds (0 = manual stop) */
  autoStopSeconds: number;
  
  /** Enable swing event detection during recording */
  detectEvents: boolean;
}

/**
 * Default recording configuration
 */
export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  targetSampleRate: 100,
  autoStopSeconds: 0,
  detectEvents: true,
};
