/**
 * Calibration Types
 * 
 * Types for Impact Neutral Calibration feature.
 * The baseline represents the user's ideal slightly-flexed impact wrist position.
 */

import { Quaternion, EulerAngles } from './sensor';

/**
 * Impact Neutral Calibration Baseline
 * Stores the user's calibrated "ideal" impact position
 */
export interface ImpactNeutralBaseline {
  /** Quaternion orientation (preferred) */
  quat?: Quaternion;
  
  /** Euler angles fallback if quaternion not available */
  euler?: EulerAngles;
  
  /** Timestamp when calibration was performed */
  calibratedAt: string;
  
  /** Device ID used for calibration */
  deviceId: string;
  
  /** Whether calibration used simulated sensor */
  isSimulated: boolean;
}

/**
 * Wrist error rating thresholds (in degrees)
 */
export interface WristErrorThresholds {
  /** Maximum error for "Great" rating */
  great: number;
  
  /** Maximum error for "OK" rating (above this is "Off") */
  ok: number;
}

/**
 * Default thresholds for wrist error ratings
 */
export const DEFAULT_WRIST_ERROR_THRESHOLDS: WristErrorThresholds = {
  great: 5,   // Within 5 degrees = Great
  ok: 15,     // Within 15 degrees = OK, above = Off
};

/**
 * Wrist error rating labels
 */
export type WristErrorRating = 'Great' | 'OK' | 'Off';

/**
 * Get rating for a wrist error value
 */
export function getWristErrorRating(
  errorDegrees: number,
  thresholds: WristErrorThresholds = DEFAULT_WRIST_ERROR_THRESHOLDS
): WristErrorRating {
  const absError = Math.abs(errorDegrees);
  if (absError <= thresholds.great) return 'Great';
  if (absError <= thresholds.ok) return 'OK';
  return 'Off';
}

/**
 * Hold Flexion status - indicates whether user maintained or lost flexion
 */
export type HoldFlexionStatus = 
  | 'Held'      // Error decreased or stayed same from Top to Impact
  | 'Released'  // Error increased (moved away from target)
  | 'Unknown';  // Not enough data

/**
 * Wrist error metrics for a swing
 */
export interface WristErrorMetrics {
  /** Error at Top of backswing (degrees) */
  errorAtTop?: number;
  
  /** Error at Impact (degrees) */
  errorAtImpact?: number;
  
  /** Rating at Impact */
  impactRating?: WristErrorRating;
  
  /** Whether user held flexion from Top to Impact */
  holdFlexion?: HoldFlexionStatus;
  
  /** Change in error from Top to Impact (negative = improved toward target) */
  errorChange?: number;
}

/**
 * App settings
 */
export interface AppSettings {
  /** Enable audio/haptic feedback during impact */
  feedbackEnabled: boolean;
  
  /** Wrist error thresholds for ratings */
  wristErrorThresholds: WristErrorThresholds;
  
  /** Volume for audio feedback (0-1) */
  feedbackVolume: number;
  
  /** Enable haptic vibration */
  hapticEnabled: boolean;
}

/**
 * Default app settings
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  feedbackEnabled: true,
  wristErrorThresholds: DEFAULT_WRIST_ERROR_THRESHOLDS,
  feedbackVolume: 0.8,
  hapticEnabled: true,
};
