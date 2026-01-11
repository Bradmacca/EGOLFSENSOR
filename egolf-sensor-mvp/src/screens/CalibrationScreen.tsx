/**
 * Calibration Screen
 * 
 * Impact Neutral Calibration flow where the user sets their ideal
 * slightly-flexed impact wrist position as the baseline target.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSensor } from '../context';
import { StatusChip } from '../components/StatusChip';
import { MetricRow } from '../components/MetricRow';
import { WristAngleGauge } from '../components/WristAngleGauge';
import { PlacementGuideModal } from '../components/PlacementGuideModal';
import {
  saveImpactNeutralBaseline,
  loadImpactNeutralBaseline,
  clearImpactNeutralBaseline,
  saveAddressReference,
  saveImpactReference,
  loadAddressReference,
  loadImpactReference,
  loadCalibrationPoints,
} from '../storage/CalibrationStorage';
import {
  ImpactNeutralBaseline,
} from '../types/calibration';
import { Quaternion, EulerAngles, SensorSample } from '../types';
import { averageQuaternions, averageEulerAngles, formatDate } from '../utils/math';

type CalibrationState = 'idle' | 'countdown' | 'capturing' | 'complete' | 'error';
type CalibrationStep = 'address' | 'impact';

const COUNTDOWN_SECONDS = 3;
const CAPTURE_DURATION_MS = 2000; // 2 seconds of capture
const MIN_SAMPLES_REQUIRED = 100; // At 100Hz, we should get ~200 samples in 2 seconds

export function CalibrationScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {
    isUsingSimulator,
    sensorStatus,
    isStreaming,
    startStreaming,
    stopStreaming,
    currentSample,
  } = useSensor();
  
  const [calibrationState, setCalibrationState] = useState<CalibrationState>('idle');
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('address');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [existingBaseline, setExistingBaseline] = useState<ImpactNeutralBaseline | null>(null);
  const [existingAddress, setExistingAddress] = useState<ImpactNeutralBaseline | null>(null);
  const [existingImpact, setExistingImpact] = useState<ImpactNeutralBaseline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlacementGuide, setShowPlacementGuide] = useState(false);
  
  // Capture buffers
  const capturedSamplesRef = useRef<SensorSample[]>([]);
  const captureStartTimeRef = useRef<number>(0);
  
  // Check if connected/ready
  const isConnected = isUsingSimulator || sensorStatus.isConnected;
  
  // Load existing calibration on mount
  useEffect(() => {
    async function loadCalibration() {
      const [baseline, address, impact] = await Promise.all([
        loadImpactNeutralBaseline(),
        loadAddressReference(),
        loadImpactReference(),
      ]);
      setExistingBaseline(baseline);
      setExistingAddress(address);
      setExistingImpact(impact);
    }
    loadCalibration();
  }, []);
  
  // Capture samples during calibration
  useEffect(() => {
    if (calibrationState === 'capturing' && currentSample) {
      capturedSamplesRef.current.push(currentSample);
      
      const elapsed = Date.now() - captureStartTimeRef.current;
      setCaptureProgress(Math.min(elapsed / CAPTURE_DURATION_MS, 1));
      
      if (elapsed >= CAPTURE_DURATION_MS) {
        finishCapture();
      }
    }
  }, [calibrationState, currentSample]);
  
  // Start calibration process
  const startCalibration = useCallback(async () => {
    setError(null);
    capturedSamplesRef.current = [];
    
    // Ensure streaming is active
    if (!isStreaming) {
      try {
        await startStreaming();
      } catch (err: any) {
        setError('Failed to start sensor streaming');
        return;
      }
    }
    
    // Start countdown
    setCalibrationState('countdown');
    setCountdown(COUNTDOWN_SECONDS);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Start capturing
          setCalibrationState('capturing');
          captureStartTimeRef.current = Date.now();
          setCaptureProgress(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isStreaming, startStreaming]);
  
  // Finish capture and process samples
  const finishCapture = useCallback(async () => {
    const samples = capturedSamplesRef.current;
    
    if (samples.length < MIN_SAMPLES_REQUIRED) {
      setCalibrationState('error');
      setError(`Not enough samples captured (${samples.length}/${MIN_SAMPLES_REQUIRED}). Please try again.`);
      return;
    }
    
    // Calculate average orientation from captured samples
    const quaternions: Quaternion[] = [];
    const eulerAngles: EulerAngles[] = [];
    
    for (const sample of samples) {
      if (sample.quat) {
        quaternions.push(sample.quat);
      }
      if (sample.euler) {
        eulerAngles.push(sample.euler);
      }
    }
    
    const baseline: ImpactNeutralBaseline = {
      calibratedAt: new Date().toISOString(),
      deviceId: sensorStatus.deviceId,
      isSimulated: isUsingSimulator,
    };
    
    // Prefer quaternion if available
    if (quaternions.length > 0) {
      baseline.quat = averageQuaternions(quaternions);
    }
    
    // Always save euler as fallback
    if (eulerAngles.length > 0) {
      baseline.euler = averageEulerAngles(eulerAngles);
    }
    
    // Save baseline based on current step
    try {
      if (calibrationStep === 'address') {
        await saveAddressReference(baseline);
        setExistingAddress(baseline);
      } else {
        await saveImpactReference(baseline);
        setExistingImpact(baseline);
        // Also update legacy baseline
        await saveImpactNeutralBaseline(baseline);
        setExistingBaseline(baseline);
      }
      setCalibrationState('complete');
    } catch (err: any) {
      setCalibrationState('error');
      setError('Failed to save calibration data');
    }
  }, [sensorStatus.deviceId, isUsingSimulator, calibrationStep]);
  
  // Reset calibration
  const resetCalibration = useCallback(() => {
    setCalibrationState('idle');
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureProgress(0);
    setError(null);
    capturedSamplesRef.current = [];
  }, []);

  // Move to next step
  const moveToNextStep = useCallback(() => {
    if (calibrationStep === 'address') {
      setCalibrationStep('impact');
      resetCalibration();
    } else {
      // Both steps complete, go back to address for recalibration
      setCalibrationStep('address');
      resetCalibration();
    }
  }, [calibrationStep, resetCalibration]);
  
  // Clear existing calibration
  const handleClearCalibration = useCallback(() => {
    Alert.alert(
      'Clear Calibration',
      'Are you sure you want to clear your Impact Neutral calibration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearImpactNeutralBaseline();
            setExistingBaseline(null);
            resetCalibration();
          },
        },
      ]
    );
  }, [resetCalibration]);
  
  // Get current wrist angle for display
  const currentRoll = currentSample?.euler?.roll ?? 0;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backNav}>
            <Text style={styles.backNavText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Impact Neutral Calibration</Text>
          <View style={styles.statusRow}>
            <StatusChip
              label={isUsingSimulator ? 'Simulated' : isConnected ? 'Connected' : 'Disconnected'}
              status={isConnected ? 'active' : 'error'}
              size="small"
            />
            {existingBaseline && (
              <StatusChip
                label="Calibrated"
                status="active"
                size="small"
              />
            )}
          </View>
        </View>
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, calibrationStep === 'address' && styles.stepActive]}>
            <Text style={[styles.stepText, calibrationStep === 'address' && styles.stepTextActive]}>
              1. Address
            </Text>
            {existingAddress && (
              <View style={styles.stepCheck}>
                <Text style={styles.stepCheckText}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.stepConnector} />
          <View style={[styles.step, calibrationStep === 'impact' && styles.stepActive]}>
            <Text style={[styles.stepText, calibrationStep === 'impact' && styles.stepTextActive]}>
              2. Impact
            </Text>
            {existingImpact && (
              <View style={styles.stepCheck}>
                <Text style={styles.stepCheckText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <View style={styles.instructionsHeader}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            <TouchableOpacity
              onPress={() => setShowPlacementGuide(true)}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>
          {calibrationStep === 'address' ? (
            <Text style={styles.instructionsText}>
              1. Attach the sensor to your lead wrist{'\n'}
              2. Assume your address position (setup position):{'\n'}
              {'   '}• Natural, comfortable stance{'\n'}
              {'   '}• Normal wrist position{'\n'}
              {'   '}• Ready to start your swing{'\n'}
              3. Hold completely still for 2 seconds{'\n'}
              4. This position will be your address reference
            </Text>
          ) : (
            <Text style={styles.instructionsText}>
              1. Attach the sensor to your lead wrist{'\n'}
              2. Assume your ideal impact position:{'\n'}
              {'   '}• Slightly flexed lead wrist (your target){'\n'}
              {'   '}• Hands ahead of the ball{'\n'}
              {'   '}• Proper shaft lean{'\n'}
              3. Hold completely still for 2 seconds{'\n'}
              4. This position will be your impact reference
            </Text>
          )}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              💡 This is YOUR ideal position – not necessarily 0°. The app will measure 
              how close you get to this position during your swings.
            </Text>
          </View>
        </View>
        
        {/* Live Preview */}
        {isStreaming && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Live Preview</Text>
            <WristAngleGauge
              angle={currentRoll}
              label="Current Wrist Position"
              minAngle={-60}
              maxAngle={60}
              size={180}
            />
          </View>
        )}
        
        {/* Calibration State Display */}
        <View style={styles.stateSection}>
          {calibrationState === 'idle' && (
            <View style={styles.stateContent}>
              <Text style={styles.stateTitle}>Ready to Calibrate</Text>
              <Text style={styles.stateSubtitle}>
                Assume your ideal impact position and tap the button below
              </Text>
            </View>
          )}
          
          {calibrationState === 'countdown' && (
            <View style={styles.stateContent}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.stateSubtitle}>
                Get into position and hold still...
              </Text>
            </View>
          )}
          
          {calibrationState === 'capturing' && (
            <View style={styles.stateContent}>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${captureProgress * 100}%` }]} />
              </View>
              <Text style={styles.stateTitle}>Capturing...</Text>
              <Text style={styles.stateSubtitle}>
                Hold completely still ({capturedSamplesRef.current.length} samples)
              </Text>
            </View>
          )}
          
          {calibrationState === 'complete' && (
            <View style={styles.stateContent}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.stateTitle}>Calibration Complete!</Text>
              <Text style={styles.stateSubtitle}>
                Your {calibrationStep === 'address' ? 'address' : 'impact'} reference has been saved
              </Text>
            </View>
          )}
          
          {calibrationState === 'error' && (
            <View style={styles.stateContent}>
              <Text style={styles.errorIcon}>✗</Text>
              <Text style={styles.stateTitle}>Calibration Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {(calibrationState === 'idle' || calibrationState === 'error') && (
            <TouchableOpacity
              style={[styles.calibrateButton, !isConnected && styles.buttonDisabled]}
              onPress={startCalibration}
              disabled={!isConnected}
            >
              <Text style={styles.calibrateButtonText}>
                {calibrationStep === 'address' 
                  ? (existingAddress ? 'Recalibrate Address' : 'Start Address Calibration')
                  : (existingImpact ? 'Recalibrate Impact' : 'Start Impact Calibration')
                }
              </Text>
            </TouchableOpacity>
          )}
          
          {calibrationState === 'complete' && (
            <>
              {calibrationStep === 'address' ? (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={moveToNextStep}
                >
                  <Text style={styles.doneButtonText}>Continue to Impact</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.recalibrateButton}
                onPress={resetCalibration}
              >
                <Text style={styles.recalibrateButtonText}>
                  {calibrationStep === 'address' ? 'Recalibrate Address' : 'Recalibrate Impact'}
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          {(calibrationState === 'countdown' || calibrationState === 'capturing') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetCalibration}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Existing Calibration Info */}
        {(existingAddress || existingImpact) && calibrationState === 'idle' && (
          <View style={styles.existingSection}>
            <Text style={styles.sectionTitle}>Current Calibration</Text>
            {existingAddress && (
              <>
                <Text style={styles.subsectionTitle}>Address Reference</Text>
                <MetricRow
                  label="Calibrated"
                  value={formatDate(existingAddress.calibratedAt)}
                />
                {existingAddress.euler && (
                  <MetricRow
                    label="Address Roll"
                    value={existingAddress.euler.roll.toFixed(1)}
                    unit="°"
                  />
                )}
              </>
            )}
            {existingImpact && (
              <>
                <Text style={styles.subsectionTitle}>Impact Reference</Text>
                <MetricRow
                  label="Calibrated"
                  value={formatDate(existingImpact.calibratedAt)}
                />
                {existingImpact.euler && (
                  <MetricRow
                    label="Impact Roll"
                    value={existingImpact.euler.roll.toFixed(1)}
                    unit="°"
                  />
                )}
              </>
            )}
            
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearCalibration}
            >
              <Text style={styles.clearButtonText}>Clear All Calibration</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Help */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Why Calibrate?</Text>
          <Text style={styles.helpText}>
            Every golfer has a slightly different ideal wrist position at impact. 
            By calibrating YOUR target position, the app can measure how consistently 
            you return to that position during your swings.
          </Text>
        </View>
      </ScrollView>

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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  backNav: {
    marginBottom: 12,
  },
  backNavText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  instructionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
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
  instructionsText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
  },
  noteBox: {
    backgroundColor: '#3b82f620',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 20,
  },
  previewSection: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e1e2d',
  },
  stepActive: {
    backgroundColor: '#3b82f6',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepTextActive: {
    color: '#ffffff',
  },
  stepCheck: {
    marginLeft: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  stepConnector: {
    width: 30,
    height: 2,
    backgroundColor: '#1e1e2d',
    marginHorizontal: 8,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  stateSection: {
    padding: 24,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  stateContent: {
    alignItems: 'center',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 16,
  },
  progressContainer: {
    width: 200,
    height: 8,
    backgroundColor: '#1e1e2d',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  successIcon: {
    fontSize: 48,
    color: '#22c55e',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
    color: '#ef4444',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  actionSection: {
    padding: 16,
    gap: 12,
  },
  calibrateButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  calibrateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  recalibrateButton: {
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  recalibrateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  cancelButton: {
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  existingSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e1e2d',
  },
  clearButton: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  helpSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e1e2d',
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
});
