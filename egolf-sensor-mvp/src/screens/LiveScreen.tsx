/**
 * Live Screen
 * 
 * Real-time visualization of sensor data with wrist angle gauge and metrics.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSensor } from '../context';
import { WristAngleGauge } from '../components/WristAngleGauge';
import { MetricRow, MetricGrid } from '../components/MetricRow';
import { StatusChip } from '../components/StatusChip';
import { PlacementGuideModal } from '../components/PlacementGuideModal';
import { FlipDetector } from '../components/FlipDetector';
import { getWristErrorRating, FlipStatus } from '../types/calibration';
import { FlipDetector as FlipDetectorUtil } from '../utils/FlipDetector';

export function LiveScreen(): React.JSX.Element {
  const {
    isUsingSimulator,
    sensorStatus,
    isStreaming,
    startStreaming,
    stopStreaming,
    currentSample,
    gyroMagnitude,
    sampleRateEstimate,
    isRecording,
    triggerSimulatedSwing,
    setSimulatorSwingMode,
    impactNeutralBaseline,
    currentWristError,
  } = useSensor();
  
  const [showPlacementGuide, setShowPlacementGuide] = useState(false);
  const [flipStatus, setFlipStatus] = useState<FlipStatus>('Unknown');
  const [flipAngleDelta, setFlipAngleDelta] = useState<number | undefined>(undefined);
  const flipDetectorRef = useRef<FlipDetectorUtil>(new FlipDetectorUtil({
    sampleRateHz: sampleRateEstimate || 100,
  }));
  
  // Update flip detector sample rate
  useEffect(() => {
    if (sampleRateEstimate > 0) {
      flipDetectorRef.current.updateConfig({ sampleRateHz: sampleRateEstimate });
    }
  }, [sampleRateEstimate]);
  
  // Add samples to flip detector when streaming
  useEffect(() => {
    if (isStreaming && currentSample) {
      flipDetectorRef.current.addSample(currentSample);
    } else if (!isStreaming) {
      // Clear buffer when not streaming
      flipDetectorRef.current.clear();
      setFlipStatus('Unknown');
      setFlipAngleDelta(undefined);
    }
  }, [isStreaming, currentSample]);
  
  // Handle manual impact trigger
  const handleTapImpact = useCallback(() => {
    const result = flipDetectorRef.current.detectFlip();
    setFlipStatus(result.status);
    setFlipAngleDelta(result.angleDelta);
  }, []);
  
  // Toggle streaming
  const handleToggleStreaming = useCallback(async () => {
    if (isStreaming) {
      await stopStreaming();
    } else {
      await startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);
  
  // Get wrist angle proxy (using roll from euler)
  const wristAngle = currentSample?.euler?.roll ?? 0;
  const pitch = currentSample?.euler?.pitch ?? 0;
  const yaw = currentSample?.euler?.yaw ?? 0;
  
  // Connection status
  const isConnected = isUsingSimulator || sensorStatus.isConnected;
  const connectionStatus = isUsingSimulator 
    ? 'Simulated' 
    : sensorStatus.isConnected 
      ? 'Connected' 
      : 'Disconnected';
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Live View</Text>
            <TouchableOpacity
              onPress={() => setShowPlacementGuide(true)}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusRow}>
            <StatusChip
              label={connectionStatus}
              status={isConnected ? 'active' : 'error'}
              size="small"
            />
            {isRecording && (
              <StatusChip
                label="Recording"
                status="warning"
                size="small"
              />
            )}
            <StatusChip
              label={isStreaming ? 'Streaming' : 'Stopped'}
              status={isStreaming ? 'active' : 'inactive'}
              size="small"
            />
            {isStreaming && sampleRateEstimate > 0 && (
              <StatusChip
                label={`${sampleRateEstimate.toFixed(0)} Hz`}
                status={sampleRateEstimate > 80 ? 'active' : 'warning'}
                size="small"
              />
            )}
          </View>
        </View>
        
        {/* Start/Stop Streaming Button */}
        <View style={styles.controlSection}>
          <TouchableOpacity
            style={[
              styles.streamButton,
              isStreaming ? styles.streamButtonStop : styles.streamButtonStart,
              !isConnected && styles.streamButtonDisabled,
            ]}
            onPress={handleToggleStreaming}
            disabled={!isConnected}
          >
            <Text style={styles.streamButtonText}>
              {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
            </Text>
          </TouchableOpacity>
          
          {/* Simulator swing controls */}
          {isUsingSimulator && isStreaming && (
            <View style={styles.simulatorControls}>
              <TouchableOpacity
                style={styles.swingButton}
                onPress={triggerSimulatedSwing}
              >
                <Text style={styles.swingButtonText}>Trigger Swing</Text>
              </TouchableOpacity>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => setSimulatorSwingMode('idle')}
                >
                  <Text style={styles.modeButtonText}>Idle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeButton}
                  onPress={() => setSimulatorSwingMode('periodic')}
                >
                  <Text style={styles.modeButtonText}>Auto</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {/* Wrist Angle Gauge */}
        <View style={styles.gaugeSection}>
          <WristAngleGauge
            angle={wristAngle}
            label="Wrist Angle (Roll)"
            minAngle={-60}
            maxAngle={60}
            targetZone={impactNeutralBaseline ? undefined : { min: -10, max: 10 }}
            wristError={currentWristError}
            showThresholds={!!impactNeutralBaseline}
          />
        </View>
        
        {/* Euler Angles */}
        <View style={styles.metricsSection}>
          <Text style={styles.metricsTitle}>Orientation</Text>
          <MetricRow label="Roll (Wrist)" value={wristAngle} unit="°" highlight />
          <MetricRow label="Pitch" value={pitch} unit="°" />
          <MetricRow label="Yaw" value={yaw} unit="°" />
        </View>
        
        {/* Flip Detector */}
        {isStreaming && (
          <View style={styles.metricsSection}>
            <Text style={styles.metricsTitle}>Flip Detection</Text>
            <FlipDetector
              status={flipStatus}
              angleDelta={flipAngleDelta}
              showDetails={true}
            />
            <TouchableOpacity
              style={styles.tapImpactButton}
              onPress={handleTapImpact}
            >
              <Text style={styles.tapImpactButtonText}>Tap Impact</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wrist Error (if calibrated) */}
        {impactNeutralBaseline && (
          <View style={styles.metricsSection}>
            <Text style={styles.metricsTitle}>Impact Neutral Error</Text>
            {currentWristError !== null ? (
              <>
                <View style={styles.errorDisplayRow}>
                  <Text style={[
                    styles.errorValue,
                    { color: getErrorColor(currentWristError) }
                  ]}>
                    {currentWristError.toFixed(1)}°
                  </Text>
                  <View style={[
                    styles.errorBadge,
                    { backgroundColor: getErrorBgColor(currentWristError) }
                  ]}>
                    <Text style={[
                      styles.errorBadgeText,
                      { color: getErrorColor(currentWristError) }
                    ]}>
                      {getWristErrorRating(currentWristError)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.errorHelp}>
                  Distance from your calibrated target position
                </Text>
              </>
            ) : (
              <Text style={styles.errorNoData}>Waiting for sensor data...</Text>
            )}
          </View>
        )}
        
        {/* Gyro */}
        <View style={styles.metricsSection}>
          <Text style={styles.metricsTitle}>Gyroscope</Text>
          <MetricRow 
            label="Magnitude" 
            value={gyroMagnitude} 
            unit="°/s" 
            highlight={gyroMagnitude > 200}
          />
          {currentSample && (
            <MetricGrid
              label="Angular Velocity"
              x={currentSample.gyro.x}
              y={currentSample.gyro.y}
              z={currentSample.gyro.z}
              precision={0}
            />
          )}
        </View>
        
        {/* Accelerometer */}
        <View style={styles.metricsSection}>
          <Text style={styles.metricsTitle}>Accelerometer</Text>
          {currentSample && (
            <MetricGrid
              label="Acceleration (g)"
              x={currentSample.accel.x}
              y={currentSample.accel.y}
              z={currentSample.accel.z}
              precision={2}
            />
          )}
        </View>
        
        {/* Signal Quality */}
        {!isUsingSimulator && (
          <View style={styles.metricsSection}>
            <Text style={styles.metricsTitle}>Connection</Text>
            <MetricRow 
              label="Signal Quality" 
              value={sensorStatus.signalQuality} 
              unit="%" 
            />
            <MetricRow 
              label="Sample Rate" 
              value={sampleRateEstimate} 
              unit="Hz" 
            />
          </View>
        )}
        
        {/* Not Connected Message */}
        {!isConnected && (
          <View style={styles.notConnected}>
            <Text style={styles.notConnectedText}>
              No sensor connected. Go to Connect screen to set up a device
              or enable simulated sensor.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Placement Guide Modal */}
      <PlacementGuideModal
        visible={showPlacementGuide}
        onClose={() => setShowPlacementGuide(false)}
      />
    </SafeAreaView>
  );
}

// Helper functions for wrist error display
function getErrorColor(error: number): string {
  const rating = getWristErrorRating(error);
  switch (rating) {
    case 'Great': return '#22c55e';
    case 'OK': return '#f59e0b';
    case 'Off': return '#ef4444';
  }
}

function getErrorBgColor(error: number): string {
  const rating = getWristErrorRating(error);
  switch (rating) {
    case 'Great': return '#22c55e20';
    case 'OK': return '#f59e0b20';
    case 'Off': return '#ef444420';
  }
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  helpButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  streamButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  streamButtonStart: {
    backgroundColor: '#22c55e',
  },
  streamButtonStop: {
    backgroundColor: '#ef4444',
  },
  streamButtonDisabled: {
    backgroundColor: '#374151',
  },
  streamButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  simulatorControls: {
    marginTop: 12,
    gap: 8,
  },
  swingButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  swingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  gaugeSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  metricsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  notConnected: {
    padding: 32,
    alignItems: 'center',
  },
  notConnectedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e2d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  errorValue: {
    fontSize: 32,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  errorBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  errorBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorHelp: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorNoData: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 16,
  },
  tapImpactButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  tapImpactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
