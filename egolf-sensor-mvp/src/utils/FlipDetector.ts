/**
 * Flip Detector Utility
 * 
 * Detects wrist "flip" by computing angle delta shortly before impact.
 * A flip occurs when the wrist angle changes significantly (extends) just before impact.
 */

import { SensorSample } from '../types';
import { FlipStatus, FlipDetectionResult } from '../types/calibration';

/**
 * Configuration for flip detection
 */
export interface FlipDetectorConfig {
  /** Number of samples to keep in buffer (e.g., 20 samples = ~200ms at 100Hz) */
  bufferSize: number;
  
  /** Time window before impact to analyze (ms) */
  preImpactWindowMs: number;
  
  /** Minimum angle delta to consider a flip (degrees) */
  flipThreshold: number;
  
  /** Sample rate estimate (Hz) - used to convert time to samples */
  sampleRateHz: number;
}

const DEFAULT_CONFIG: FlipDetectorConfig = {
  bufferSize: 20,
  preImpactWindowMs: 150, // Analyze 100-200ms before impact
  flipThreshold: 15, // 15 degrees delta = flip
  sampleRateHz: 100,
};

/**
 * Flip Detector Class
 * Maintains a buffer of recent wrist angle samples and detects flips on impact events
 */
export class FlipDetector {
  private config: FlipDetectorConfig;
  private angleBuffer: number[] = [];
  private timestampBuffer: number[] = [];
  
  constructor(config: Partial<FlipDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<FlipDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Add a sample to the buffer
   * Call this for each sensor sample during streaming
   */
  addSample(sample: SensorSample): void {
    const angle = sample.euler?.roll ?? 0;
    const timestamp = sample.timestampMs;
    
    // Add to buffers
    this.angleBuffer.push(angle);
    this.timestampBuffer.push(timestamp);
    
    // Keep buffer size limited
    if (this.angleBuffer.length > this.config.bufferSize) {
      this.angleBuffer.shift();
      this.timestampBuffer.shift();
    }
  }
  
  /**
   * Detect flip based on current buffer and impact event
   * @param impactTimestamp - Timestamp of impact event (or current time if using button)
   * @returns Flip detection result
   */
  detectFlip(impactTimestamp?: number): FlipDetectionResult {
    if (this.angleBuffer.length < 5) {
      return {
        status: 'Unknown',
      };
    }
    
    const impactTime = impactTimestamp ?? Date.now();
    
    // Find samples in the pre-impact window (100-200ms before impact)
    const windowStart = impactTime - this.config.preImpactWindowMs - 50; // Start 50ms earlier
    const windowEnd = impactTime - 50; // End 50ms before impact
    
    const preImpactAngles: number[] = [];
    
    for (let i = 0; i < this.timestampBuffer.length; i++) {
      const ts = this.timestampBuffer[i];
      if (ts >= windowStart && ts <= windowEnd) {
        preImpactAngles.push(this.angleBuffer[i]);
      }
    }
    
    if (preImpactAngles.length === 0) {
      // Not enough data in the window, use recent samples
      const recentCount = Math.min(10, this.angleBuffer.length);
      const recentAngles = this.angleBuffer.slice(-recentCount);
      const avgPreImpact = recentAngles.reduce((a, b) => a + b, 0) / recentAngles.length;
      const impactAngle = this.angleBuffer[this.angleBuffer.length - 1];
      const delta = impactAngle - avgPreImpact;
      
      return {
        status: Math.abs(delta) > this.config.flipThreshold ? 'Flipped' : 'Not Flipped',
        angleDelta: delta,
        detectedAt: impactTime,
      };
    }
    
    // Calculate average angle in pre-impact window
    const avgPreImpact = preImpactAngles.reduce((a, b) => a + b, 0) / preImpactAngles.length;
    
    // Get angle at impact (most recent sample)
    const impactAngle = this.angleBuffer[this.angleBuffer.length - 1];
    
    // Calculate delta (positive = extended/flipped, negative = flexed)
    const delta = impactAngle - avgPreImpact;
    
    // Determine flip status
    const isFlipped = Math.abs(delta) > this.config.flipThreshold && delta > 0;
    
    return {
      status: isFlipped ? 'Flipped' : 'Not Flipped',
      angleDelta: delta,
      detectedAt: impactTime,
    };
  }
  
  /**
   * Clear the buffer
   */
  clear(): void {
    this.angleBuffer = [];
    this.timestampBuffer = [];
  }
  
  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.angleBuffer.length;
  }
}
