/**
 * Math utilities for sensor data processing
 */

import { Vector3, Quaternion, EulerAngles } from '../types';

/**
 * Calculate magnitude of a 3D vector
 */
export function vectorMagnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Convert quaternion to euler angles (in degrees)
 * Uses ZYX convention (yaw-pitch-roll)
 */
export function quaternionToEuler(q: Quaternion): EulerAngles {
  const { w, x, y, z } = q;
  
  // Roll (X-axis rotation)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);
  
  // Pitch (Y-axis rotation)
  const sinp = 2 * (w * y - z * x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * 90; // Use 90 degrees if out of range
  } else {
    pitch = Math.asin(sinp) * (180 / Math.PI);
  }
  
  // Yaw (Z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);
  
  return { roll, pitch, yaw };
}

/**
 * Convert euler angles (degrees) to quaternion
 */
export function eulerToQuaternion(euler: EulerAngles): Quaternion {
  const { roll, pitch, yaw } = euler;
  
  // Convert to radians
  const r = roll * (Math.PI / 180);
  const p = pitch * (Math.PI / 180);
  const y = yaw * (Math.PI / 180);
  
  // Calculate half angles
  const cr = Math.cos(r / 2);
  const sr = Math.sin(r / 2);
  const cp = Math.cos(p / 2);
  const sp = Math.sin(p / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

/**
 * Normalize a quaternion
 */
export function normalizeQuaternion(q: Quaternion): Quaternion {
  const mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  if (mag === 0) return { w: 1, x: 0, y: 0, z: 0 };
  return {
    w: q.w / mag,
    x: q.x / mag,
    y: q.y / mag,
    z: q.z / mag,
  };
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Calculate moving average of last N values
 */
export function movingAverage(values: number[], windowSize: number): number {
  if (values.length === 0) return 0;
  const window = values.slice(-windowSize);
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Format duration in ms to MM:SS.mmm
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate the derivative (rate of change) between consecutive samples
 */
export function calculateDerivative(
  current: number,
  previous: number,
  deltaTimeMs: number
): number {
  if (deltaTimeMs === 0) return 0;
  return (current - previous) / (deltaTimeMs / 1000);
}

// ============ Quaternion Operations for Wrist Error ============

/**
 * Quaternion conjugate (inverse for unit quaternions)
 */
export function quaternionConjugate(q: Quaternion): Quaternion {
  return {
    w: q.w,
    x: -q.x,
    y: -q.y,
    z: -q.z,
  };
}

/**
 * Quaternion multiplication: q1 * q2
 */
export function quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/**
 * Calculate the angular difference between two quaternions in degrees
 * Returns the angle of the shortest rotation from q1 to q2
 */
export function quaternionAngularDifference(q1: Quaternion, q2: Quaternion): number {
  // Calculate relative rotation: q_diff = q2 * q1^(-1)
  const q1Inv = quaternionConjugate(q1);
  const qDiff = quaternionMultiply(q2, q1Inv);
  
  // Normalize the result
  const normalized = normalizeQuaternion(qDiff);
  
  // The angle of rotation is 2 * acos(w)
  // Clamp w to [-1, 1] to handle numerical errors
  const w = clamp(normalized.w, -1, 1);
  const angleRad = 2 * Math.acos(Math.abs(w));
  
  return angleRad * (180 / Math.PI);
}

/**
 * Calculate wrist error (angular difference) between current orientation and baseline
 * Uses quaternion if available, falls back to euler angles
 */
export function calculateWristError(
  current: { quat?: Quaternion; euler?: EulerAngles },
  baseline: { quat?: Quaternion; euler?: EulerAngles }
): number {
  // Prefer quaternion comparison
  if (current.quat && baseline.quat) {
    return quaternionAngularDifference(baseline.quat, current.quat);
  }
  
  // Fall back to euler angle comparison (less accurate but usable)
  const currentEuler = current.euler || (current.quat ? quaternionToEuler(current.quat) : null);
  const baselineEuler = baseline.euler || (baseline.quat ? quaternionToEuler(baseline.quat) : null);
  
  if (currentEuler && baselineEuler) {
    // Calculate RMS difference across all angles
    const rollDiff = currentEuler.roll - baselineEuler.roll;
    const pitchDiff = currentEuler.pitch - baselineEuler.pitch;
    const yawDiff = currentEuler.yaw - baselineEuler.yaw;
    
    // Primarily focus on roll (wrist flexion) and pitch (radial/ulnar deviation)
    // Weight roll higher as it's the primary wrist angle
    return Math.sqrt(rollDiff * rollDiff * 2 + pitchDiff * pitchDiff) / Math.sqrt(3);
  }
  
  return 0;
}

/**
 * Average multiple quaternions (for calibration sampling)
 */
export function averageQuaternions(quaternions: Quaternion[]): Quaternion {
  if (quaternions.length === 0) {
    return { w: 1, x: 0, y: 0, z: 0 };
  }
  
  if (quaternions.length === 1) {
    return normalizeQuaternion(quaternions[0]);
  }
  
  // Simple averaging (works well for quaternions that are close together)
  // For more accuracy, use SLERP or eigenvector methods
  let sumW = 0, sumX = 0, sumY = 0, sumZ = 0;
  
  // Ensure all quaternions are in the same hemisphere (dot product > 0)
  const reference = quaternions[0];
  
  for (const q of quaternions) {
    // Check if quaternion needs to be flipped
    const dot = reference.w * q.w + reference.x * q.x + reference.y * q.y + reference.z * q.z;
    const sign = dot < 0 ? -1 : 1;
    
    sumW += sign * q.w;
    sumX += sign * q.x;
    sumY += sign * q.y;
    sumZ += sign * q.z;
  }
  
  return normalizeQuaternion({
    w: sumW / quaternions.length,
    x: sumX / quaternions.length,
    y: sumY / quaternions.length,
    z: sumZ / quaternions.length,
  });
}

/**
 * Average multiple euler angles (for calibration sampling)
 */
export function averageEulerAngles(angles: EulerAngles[]): EulerAngles {
  if (angles.length === 0) {
    return { roll: 0, pitch: 0, yaw: 0 };
  }
  
  let sumRoll = 0, sumPitch = 0, sumYaw = 0;
  
  for (const a of angles) {
    sumRoll += a.roll;
    sumPitch += a.pitch;
    sumYaw += a.yaw;
  }
  
  return {
    roll: sumRoll / angles.length,
    pitch: sumPitch / angles.length,
    yaw: sumYaw / angles.length,
  };
}
