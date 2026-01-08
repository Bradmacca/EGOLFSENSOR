/**
 * Swing Event Detector
 * 
 * Basic v1 implementation using gyro magnitude to detect:
 * - Swing Start: when gyro magnitude crosses threshold for N ms
 * - Top of Backswing: local minimum/inflection after backswing peak
 * - Impact: largest gyro spike after transition
 * 
 * Now includes wrist error computation against calibrated Impact Neutral baseline.
 * 
 * TODO: Refine thresholds with real sensor data
 * TODO: Add more sophisticated detection (machine learning, etc.)
 */

import { SensorSample, SwingEvent, SwingEventType, Quaternion, EulerAngles } from '../types';
import { ImpactNeutralBaseline } from '../types/calibration';
import { vectorMagnitude, calculateWristError } from '../utils/math';

/**
 * Configuration for swing detection
 */
export interface SwingDetectorConfig {
  /** Gyro magnitude threshold to detect swing start (deg/s) */
  startThreshold: number;
  
  /** Duration threshold must be exceeded to confirm start (ms) */
  startDurationMs: number;
  
  /** Gyro magnitude threshold to detect impact (deg/s) */
  impactThreshold: number;
  
  /** Window size for smoothing (samples) */
  smoothingWindow: number;
  
  /** Minimum time between detected swings (ms) */
  minSwingIntervalMs: number;
  
  /** Enable debug logging */
  debug: boolean;
}

const DEFAULT_CONFIG: SwingDetectorConfig = {
  startThreshold: 100,      // deg/s - relatively low to catch backswing start
  startDurationMs: 50,      // Must exceed threshold for 50ms
  impactThreshold: 500,     // deg/s - high threshold for impact
  smoothingWindow: 5,       // 5 samples at 100Hz = 50ms smoothing
  minSwingIntervalMs: 2000, // At least 2 seconds between swings
  debug: false,
};

/**
 * Detection state machine states
 */
type DetectionState = 
  | 'idle'          // Waiting for swing to start
  | 'potential_start' // Threshold crossed, waiting for confirmation
  | 'backswing'     // In backswing, looking for top
  | 'transition'    // At top, waiting for downswing
  | 'downswing'     // In downswing, looking for impact
  | 'follow_through'; // After impact, waiting for swing to end

/**
 * Real-time swing event detector
 */
export class SwingDetector {
  private config: SwingDetectorConfig;
  private state: DetectionState = 'idle';
  
  // Buffers for analysis
  private gyroMagnitudeBuffer: number[] = [];
  private timestampBuffer: number[] = [];
  
  // State tracking
  private potentialStartTime: number = 0;
  private lastSwingEndTime: number = 0;
  private backswingPeakMagnitude: number = 0;
  private backswingPeakTime: number = 0;
  private currentSwingEvents: SwingEvent[] = [];
  
  // Sample buffer for orientation at events
  private recentSamples: SensorSample[] = [];
  private readonly SAMPLE_BUFFER_SIZE = 50; // Keep last 50 samples for event orientation lookup
  
  // Impact Neutral baseline for wrist error computation
  private impactNeutralBaseline: ImpactNeutralBaseline | null = null;
  
  // Callback for detected events
  private onEventCallback: ((event: SwingEvent) => void) | null = null;
  
  // Callback for impact feedback (called when impact is detected with wrist error)
  private onImpactFeedbackCallback: ((wristError: number) => void) | null = null;
  
  constructor(config: Partial<SwingDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Set the Impact Neutral baseline for wrist error computation
   */
  setImpactNeutralBaseline(baseline: ImpactNeutralBaseline | null): void {
    this.impactNeutralBaseline = baseline;
  }
  
  /**
   * Set callback for impact feedback (for audio/haptic)
   */
  onImpactFeedback(callback: (wristError: number) => void): void {
    this.onImpactFeedbackCallback = callback;
  }
  
  /**
   * Set callback for detected events
   */
  onEvent(callback: (event: SwingEvent) => void): void {
    this.onEventCallback = callback;
  }
  
  /**
   * Process a new sensor sample
   */
  processSample(sample: SensorSample): SwingEvent | null {
    const gyroMag = vectorMagnitude(sample.gyro);
    const timestamp = sample.timestampMs;
    
    // Add to buffers
    this.gyroMagnitudeBuffer.push(gyroMag);
    this.timestampBuffer.push(timestamp);
    
    // Keep sample buffer for orientation lookup
    this.recentSamples.push(sample);
    if (this.recentSamples.length > this.SAMPLE_BUFFER_SIZE) {
      this.recentSamples.shift();
    }
    
    // Keep buffer size manageable
    const maxBufferSize = 500; // 5 seconds at 100Hz
    if (this.gyroMagnitudeBuffer.length > maxBufferSize) {
      this.gyroMagnitudeBuffer.shift();
      this.timestampBuffer.shift();
    }
    
    // Get smoothed magnitude
    const smoothedMag = this.getSmoothedMagnitude();
    
    // Run state machine
    const event = this.updateStateMachine(smoothedMag, timestamp, sample);
    
    if (event && this.onEventCallback) {
      this.onEventCallback(event);
    }
    
    return event;
  }
  
  /**
   * Compute wrist error for a sample against the baseline
   */
  private computeWristError(sample: SensorSample): number | undefined {
    if (!this.impactNeutralBaseline) {
      return undefined;
    }
    
    return calculateWristError(
      { quat: sample.quat, euler: sample.euler },
      { quat: this.impactNeutralBaseline.quat, euler: this.impactNeutralBaseline.euler }
    );
  }
  
  /**
   * Get sample closest to a timestamp from recent buffer
   */
  private getSampleAtTime(timestampMs: number): SensorSample | undefined {
    let closest: SensorSample | undefined;
    let minDiff = Infinity;
    
    for (const sample of this.recentSamples) {
      const diff = Math.abs(sample.timestampMs - timestampMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sample;
      }
    }
    
    return closest;
  }
  
  /**
   * Get smoothed gyro magnitude (moving average)
   */
  private getSmoothedMagnitude(): number {
    const window = this.config.smoothingWindow;
    if (this.gyroMagnitudeBuffer.length < window) {
      return this.gyroMagnitudeBuffer[this.gyroMagnitudeBuffer.length - 1] || 0;
    }
    
    const recentValues = this.gyroMagnitudeBuffer.slice(-window);
    return recentValues.reduce((sum, v) => sum + v, 0) / window;
  }
  
  /**
   * Update the state machine based on current readings
   */
  private updateStateMachine(
    gyroMag: number,
    timestamp: number,
    sample: SensorSample
  ): SwingEvent | null {
    let detectedEvent: SwingEvent | null = null;
    
    switch (this.state) {
      case 'idle':
        // Check if we can start looking for a swing
        if (timestamp - this.lastSwingEndTime < this.config.minSwingIntervalMs) {
          break;
        }
        
        // Check for threshold crossing
        if (gyroMag > this.config.startThreshold) {
          this.state = 'potential_start';
          this.potentialStartTime = timestamp;
          this.log(`Potential start detected at ${timestamp}ms, gyro: ${gyroMag.toFixed(1)}`);
        }
        break;
        
      case 'potential_start':
        if (gyroMag < this.config.startThreshold) {
          // Dropped below threshold, reset
          this.state = 'idle';
          this.log('Start cancelled - dropped below threshold');
        } else if (timestamp - this.potentialStartTime >= this.config.startDurationMs) {
          // Confirmed swing start!
          this.state = 'backswing';
          this.backswingPeakMagnitude = gyroMag;
          this.backswingPeakTime = timestamp;
          this.currentSwingEvents = [];
          
          detectedEvent = {
            type: 'start',
            timestampMs: this.potentialStartTime,
            confidence: 0.8,
            data: { 
              gyroMagnitude: gyroMag,
              quat: sample.quat,
              euler: sample.euler,
            },
          };
          this.currentSwingEvents.push(detectedEvent);
          this.log(`SWING START confirmed at ${this.potentialStartTime}ms`);
        }
        break;
        
      case 'backswing':
        // Track peak gyro during backswing
        if (gyroMag > this.backswingPeakMagnitude) {
          this.backswingPeakMagnitude = gyroMag;
          this.backswingPeakTime = timestamp;
        }
        
        // Look for deceleration (potential top of backswing)
        // Top is when we've passed the peak and gyro is decreasing
        if (gyroMag < this.backswingPeakMagnitude * 0.5 && 
            timestamp - this.backswingPeakTime > 100) {
          // Detected transition zone (top of backswing)
          this.state = 'transition';
          
          // Get sample closest to the top timestamp
          const topTimestamp = this.backswingPeakTime + 50;
          const topSample = this.getSampleAtTime(topTimestamp) || sample;
          const wristError = this.computeWristError(topSample);
          
          detectedEvent = {
            type: 'top',
            timestampMs: topTimestamp,
            confidence: 0.6,
            data: { 
              gyroMagnitude: this.backswingPeakMagnitude,
              wristAngle: topSample.euler?.roll,
              wristError,
              quat: topSample.quat,
              euler: topSample.euler,
            },
          };
          this.currentSwingEvents.push(detectedEvent);
          this.log(`TOP detected at ~${detectedEvent.timestampMs}ms, wrist error: ${wristError?.toFixed(1) ?? 'N/A'}°`);
        }
        
        // Timeout if backswing takes too long
        if (timestamp - this.potentialStartTime > 2000) {
          this.log('Backswing timeout - resetting');
          this.resetSwing(timestamp);
        }
        break;
        
      case 'transition':
        // Look for acceleration indicating downswing
        if (gyroMag > this.config.startThreshold * 2) {
          this.state = 'downswing';
          this.backswingPeakMagnitude = gyroMag; // Reset for impact detection
          this.backswingPeakTime = timestamp;
          this.log(`Downswing started at ${timestamp}ms`);
        }
        
        // Timeout
        if (timestamp - this.backswingPeakTime > 500) {
          this.log('Transition timeout - resetting');
          this.resetSwing(timestamp);
        }
        break;
        
      case 'downswing':
        // Track peak for impact detection
        if (gyroMag > this.backswingPeakMagnitude) {
          this.backswingPeakMagnitude = gyroMag;
          this.backswingPeakTime = timestamp;
        }
        
        // Impact detection: look for the highest spike above threshold
        if (this.backswingPeakMagnitude > this.config.impactThreshold &&
            gyroMag < this.backswingPeakMagnitude * 0.7) {
          // We've passed the peak - that was impact!
          this.state = 'follow_through';
          
          // Get sample closest to the impact timestamp
          const impactSample = this.getSampleAtTime(this.backswingPeakTime) || sample;
          const wristError = this.computeWristError(impactSample);
          
          detectedEvent = {
            type: 'impact',
            timestampMs: this.backswingPeakTime,
            confidence: 0.7,
            data: { 
              gyroMagnitude: this.backswingPeakMagnitude,
              wristAngle: impactSample.euler?.roll,
              wristError,
              quat: impactSample.quat,
              euler: impactSample.euler,
            },
          };
          this.currentSwingEvents.push(detectedEvent);
          this.log(`IMPACT detected at ${this.backswingPeakTime}ms, peak gyro: ${this.backswingPeakMagnitude.toFixed(0)}, wrist error: ${wristError?.toFixed(1) ?? 'N/A'}°`);
          
          // Trigger feedback callback if available
          if (wristError !== undefined && this.onImpactFeedbackCallback) {
            this.onImpactFeedbackCallback(wristError);
          }
        }
        
        // Timeout
        if (timestamp - this.potentialStartTime > 3000) {
          this.log('Downswing timeout - resetting');
          this.resetSwing(timestamp);
        }
        break;
        
      case 'follow_through':
        // Wait for gyro to settle down
        if (gyroMag < this.config.startThreshold * 0.5) {
          this.log(`Swing complete at ${timestamp}ms`);
          this.resetSwing(timestamp);
        }
        
        // Timeout
        if (timestamp - this.backswingPeakTime > 1000) {
          this.resetSwing(timestamp);
        }
        break;
    }
    
    return detectedEvent;
  }
  
  /**
   * Reset swing detection state
   */
  private resetSwing(timestamp: number): void {
    this.state = 'idle';
    this.lastSwingEndTime = timestamp;
    this.backswingPeakMagnitude = 0;
    this.backswingPeakTime = 0;
  }
  
  /**
   * Get all events from the current/last swing
   */
  getCurrentSwingEvents(): SwingEvent[] {
    return [...this.currentSwingEvents];
  }
  
  /**
   * Get current detection state
   */
  getState(): DetectionState {
    return this.state;
  }
  
  /**
   * Get current gyro magnitude (for display)
   */
  getCurrentGyroMagnitude(): number {
    return this.gyroMagnitudeBuffer[this.gyroMagnitudeBuffer.length - 1] || 0;
  }
  
  /**
   * Reset the detector
   */
  reset(): void {
    this.state = 'idle';
    this.gyroMagnitudeBuffer = [];
    this.timestampBuffer = [];
    this.recentSamples = [];
    this.potentialStartTime = 0;
    this.lastSwingEndTime = 0;
    this.backswingPeakMagnitude = 0;
    this.backswingPeakTime = 0;
    this.currentSwingEvents = [];
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<SwingDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[SwingDetector] ${message}`);
    }
  }
}

/**
 * Analyze a completed session to detect/refine swing events
 * This can be used for post-recording analysis with different parameters
 */
export function analyzeSessionSwings(
  samples: SensorSample[],
  config: Partial<SwingDetectorConfig> = {},
  impactNeutralBaseline?: ImpactNeutralBaseline | null
): SwingEvent[] {
  const detector = new SwingDetector(config);
  const events: SwingEvent[] = [];
  
  if (impactNeutralBaseline) {
    detector.setImpactNeutralBaseline(impactNeutralBaseline);
  }
  
  detector.onEvent((event) => {
    events.push(event);
  });
  
  for (const sample of samples) {
    detector.processSample(sample);
  }
  
  return events;
}
