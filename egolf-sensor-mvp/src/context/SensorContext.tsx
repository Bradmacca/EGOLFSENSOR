/**
 * Sensor Context
 * 
 * Provides global state management for sensor connection and data streaming.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ISensorAdapter, SensorAdapterStatus } from '../sensors/SensorAdapter';
import { SimulatedSensor } from '../sensors/SimulatedSensor';
import { BLESensorAdapter } from '../ble/BLESensorAdapter';
import { BLEManager } from '../ble/BLEManager';
import { SwingDetector } from '../sensors/SwingDetector';
import { SessionWriter } from '../storage/SessionStorage';
import { SensorSample, SwingEvent, SessionMetadata, RecordingConfig, DEFAULT_RECORDING_CONFIG } from '../types';
import { BLEState } from '../types/ble';
import { vectorMagnitude } from '../utils/math';

/**
 * Sensor context state
 */
interface SensorContextState {
  // Connection
  isUsingSimulator: boolean;
  setUseSimulator: (use: boolean) => void;
  sensorStatus: SensorAdapterStatus;
  bleState: BLEState;
  
  // Streaming
  isStreaming: boolean;
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  
  // Live data
  currentSample: SensorSample | null;
  gyroMagnitude: number;
  sampleRateEstimate: number;
  
  // Recording
  isRecording: boolean;
  recordingDurationMs: number;
  recordingSampleCount: number;
  recordingConfig: RecordingConfig;
  setRecordingConfig: (config: Partial<RecordingConfig>) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<SessionMetadata | null>;
  
  // Swing detection
  detectedEvents: SwingEvent[];
  
  // Simulator controls
  triggerSimulatedSwing: () => void;
  setSimulatorSwingMode: (mode: 'idle' | 'continuous' | 'periodic') => void;
}

const SensorContext = createContext<SensorContextState | null>(null);

export function useSensor(): SensorContextState {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensor must be used within SensorProvider');
  }
  return context;
}

interface SensorProviderProps {
  children: React.ReactNode;
}

export function SensorProvider({ children }: SensorProviderProps): React.JSX.Element {
  // Adapter refs
  const simulatedSensorRef = useRef<SimulatedSensor>(new SimulatedSensor());
  const bleSensorRef = useRef<BLESensorAdapter>(new BLESensorAdapter());
  const swingDetectorRef = useRef<SwingDetector>(new SwingDetector({ debug: false }));
  const sessionWriterRef = useRef<SessionWriter | null>(null);
  
  // State
  const [isUsingSimulator, setIsUsingSimulator] = useState(true);
  const [sensorStatus, setSensorStatus] = useState<SensorAdapterStatus>({
    isConnected: false,
    isStreaming: false,
    sampleRate: 0,
    deviceId: '',
    deviceName: '',
    signalQuality: 0,
  });
  const [bleState, setBleState] = useState<BLEState>(BLEManager.getState());
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSample, setCurrentSample] = useState<SensorSample | null>(null);
  const [gyroMagnitude, setGyroMagnitude] = useState(0);
  const [sampleRateEstimate, setSampleRateEstimate] = useState(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingSampleCount, setRecordingSampleCount] = useState(0);
  const [recordingConfig, setRecordingConfigState] = useState<RecordingConfig>(DEFAULT_RECORDING_CONFIG);
  
  const [detectedEvents, setDetectedEvents] = useState<SwingEvent[]>([]);
  
  // Recording timer ref
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  
  // Get current adapter
  const getCurrentAdapter = useCallback((): ISensorAdapter => {
    return isUsingSimulator ? simulatedSensorRef.current : bleSensorRef.current;
  }, [isUsingSimulator]);
  
  // Subscribe to BLE state changes
  useEffect(() => {
    const unsubscribe = BLEManager.onStateChange((state) => {
      setBleState(state);
    });
    return unsubscribe;
  }, []);
  
  // Subscribe to sensor adapter status changes
  useEffect(() => {
    const adapter = getCurrentAdapter();
    const unsubscribe = adapter.onStatusChange((status) => {
      setSensorStatus(status);
    });
    setSensorStatus(adapter.getStatus());
    return unsubscribe;
  }, [getCurrentAdapter]);
  
  // Set up swing detector event callback
  useEffect(() => {
    swingDetectorRef.current.onEvent((event) => {
      setDetectedEvents(prev => [...prev, event]);
      
      // If recording, add event to session
      if (sessionWriterRef.current) {
        sessionWriterRef.current.addEvent(event);
      }
    });
  }, []);
  
  // Handle sample callback
  const handleSample = useCallback((sample: SensorSample) => {
    setCurrentSample(sample);
    setGyroMagnitude(vectorMagnitude(sample.gyro));
    
    // Process through swing detector if configured
    if (recordingConfig.detectEvents) {
      swingDetectorRef.current.processSample(sample);
    }
    
    // Write to session if recording
    if (sessionWriterRef.current) {
      sessionWriterRef.current.addSample(sample);
      setRecordingSampleCount(prev => prev + 1);
    }
  }, [recordingConfig.detectEvents]);
  
  // Set simulator usage
  const setUseSimulator = useCallback(async (use: boolean) => {
    // Stop streaming if active
    if (isStreaming) {
      await stopStreaming();
    }
    setIsUsingSimulator(use);
  }, [isStreaming]);
  
  // Start streaming
  const startStreaming = useCallback(async () => {
    const adapter = getCurrentAdapter();
    
    try {
      await adapter.startStreaming(handleSample, recordingConfig.targetSampleRate);
      setIsStreaming(true);
      swingDetectorRef.current.reset();
      setDetectedEvents([]);
      
      // Update sample rate periodically
      const rateInterval = setInterval(() => {
        setSampleRateEstimate(adapter.getStatus().sampleRate);
      }, 500);
      
      // Store interval for cleanup
      (adapter as any)._rateInterval = rateInterval;
      
    } catch (error) {
      console.error('Failed to start streaming:', error);
      throw error;
    }
  }, [getCurrentAdapter, handleSample, recordingConfig.targetSampleRate]);
  
  // Stop streaming
  const stopStreaming = useCallback(async () => {
    const adapter = getCurrentAdapter();
    
    if ((adapter as any)._rateInterval) {
      clearInterval((adapter as any)._rateInterval);
    }
    
    await adapter.stopStreaming();
    setIsStreaming(false);
    setSampleRateEstimate(0);
  }, [getCurrentAdapter]);
  
  // Set recording config
  const setRecordingConfig = useCallback((config: Partial<RecordingConfig>) => {
    setRecordingConfigState(prev => ({ ...prev, ...config }));
  }, []);
  
  // Start recording
  const startRecording = useCallback(async () => {
    const adapter = getCurrentAdapter();
    const status = adapter.getStatus();
    
    // Create session writer
    sessionWriterRef.current = new SessionWriter(
      status.deviceId,
      status.deviceName,
      recordingConfig.targetSampleRate
    );
    
    await sessionWriterRef.current.initialize();
    
    // Reset counters
    setRecordingSampleCount(0);
    setRecordingDurationMs(0);
    recordingStartTimeRef.current = Date.now();
    swingDetectorRef.current.reset();
    setDetectedEvents([]);
    
    // Start streaming if not already
    if (!isStreaming) {
      await startStreaming();
    }
    
    setIsRecording(true);
    
    // Update duration timer
    recordingTimerRef.current = setInterval(() => {
      const duration = Date.now() - recordingStartTimeRef.current;
      setRecordingDurationMs(duration);
      
      // Auto-stop if configured
      if (recordingConfig.autoStopSeconds > 0 && 
          duration >= recordingConfig.autoStopSeconds * 1000) {
        stopRecording();
      }
    }, 100);
    
  }, [getCurrentAdapter, recordingConfig, isStreaming, startStreaming]);
  
  // Stop recording
  const stopRecording = useCallback(async (): Promise<SessionMetadata | null> => {
    if (!sessionWriterRef.current) {
      return null;
    }
    
    // Stop timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Finalize session
    const metadata = await sessionWriterRef.current.finalize();
    sessionWriterRef.current = null;
    
    setIsRecording(false);
    
    return metadata;
  }, []);
  
  // Simulator controls
  const triggerSimulatedSwing = useCallback(() => {
    if (isUsingSimulator) {
      simulatedSensorRef.current.triggerSwing();
    }
  }, [isUsingSimulator]);
  
  const setSimulatorSwingMode = useCallback((mode: 'idle' | 'continuous' | 'periodic') => {
    if (isUsingSimulator) {
      simulatedSensorRef.current.setSwingMode(mode);
    }
  }, [isUsingSimulator]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simulatedSensorRef.current.dispose();
      bleSensorRef.current.dispose();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);
  
  const value: SensorContextState = {
    isUsingSimulator,
    setUseSimulator,
    sensorStatus,
    bleState,
    
    isStreaming,
    startStreaming,
    stopStreaming,
    
    currentSample,
    gyroMagnitude,
    sampleRateEstimate,
    
    isRecording,
    recordingDurationMs,
    recordingSampleCount,
    recordingConfig,
    setRecordingConfig,
    startRecording,
    stopRecording,
    
    detectedEvents,
    
    triggerSimulatedSwing,
    setSimulatorSwingMode,
  };
  
  return (
    <SensorContext.Provider value={value}>
      {children}
    </SensorContext.Provider>
  );
}
