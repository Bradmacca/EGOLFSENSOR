/**
 * Settings Screen
 * 
 * App settings for feedback preferences and wrist error thresholds.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  saveAppSettings,
  loadAppSettings,
  resetAppSettings,
  loadImpactNeutralBaseline,
} from '../storage/CalibrationStorage';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  ImpactNeutralBaseline,
} from '../types/calibration';
import { StatusChip } from '../components/StatusChip';
import { MetricRow } from '../components/MetricRow';
import { formatDate } from '../utils/math';
import { triggerHaptic, playSuccessBeep } from '../utils/feedback';

export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [calibration, setCalibration] = useState<ImpactNeutralBaseline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load settings and calibration on mount
  useEffect(() => {
    async function load() {
      const [loadedSettings, loadedCalibration] = await Promise.all([
        loadAppSettings(),
        loadImpactNeutralBaseline(),
      ]);
      setSettings(loadedSettings);
      setCalibration(loadedCalibration);
      setIsLoading(false);
    }
    load();
  }, []);
  
  // Save settings when changed
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveAppSettings(newSettings);
  }, [settings]);
  
  // Update threshold
  const updateThreshold = useCallback(async (
    key: 'great' | 'ok',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    const newThresholds = {
      ...settings.wristErrorThresholds,
      [key]: numValue,
    };
    
    // Ensure great <= ok
    if (key === 'great' && numValue > settings.wristErrorThresholds.ok) {
      newThresholds.ok = numValue;
    } else if (key === 'ok' && numValue < settings.wristErrorThresholds.great) {
      newThresholds.great = numValue;
    }
    
    await updateSettings({ wristErrorThresholds: newThresholds });
  }, [settings, updateSettings]);
  
  // Reset to defaults
  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'Reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await resetAppSettings();
            setSettings(DEFAULT_APP_SETTINGS);
          },
        },
      ]
    );
  }, []);
  
  // Test feedback
  const testFeedback = useCallback(async () => {
    if (settings.hapticEnabled) {
      triggerHaptic('medium');
    }
    if (settings.feedbackEnabled) {
      await playSuccessBeep(settings.feedbackVolume);
    }
  }, [settings]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backNav}>
            <Text style={styles.backNavText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        {/* Calibration Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impact Neutral Calibration</Text>
          
          {calibration ? (
            <View style={styles.calibrationInfo}>
              <View style={styles.calibrationRow}>
                <StatusChip label="Calibrated" status="active" size="small" />
                <Text style={styles.calibrationDate}>
                  {formatDate(calibration.calibratedAt)}
                </Text>
              </View>
              {calibration.euler && (
                <Text style={styles.calibrationDetail}>
                  Baseline: Roll {calibration.euler.roll.toFixed(1)}°, 
                  Pitch {calibration.euler.pitch.toFixed(1)}°
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.calibrationWarning}>
              <Text style={styles.calibrationWarningText}>
                ⚠️ Not calibrated. Wrist error metrics won't be available.
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.calibrateButton}
            onPress={() => (navigation as any).navigate('Calibration')}
          >
            <Text style={styles.calibrateButtonText}>
              {calibration ? 'Recalibrate' : 'Calibrate Now'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Feedback Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Audio Feedback</Text>
              <Text style={styles.settingDescription}>
                Play beep when impact is "Great"
              </Text>
            </View>
            <Switch
              value={settings.feedbackEnabled}
              onValueChange={(value) => updateSettings({ feedbackEnabled: value })}
              trackColor={{ false: '#374151', true: '#22c55e80' }}
              thumbColor={settings.feedbackEnabled ? '#22c55e' : '#9ca3af'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                Vibrate on impact events
              </Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(value) => updateSettings({ hapticEnabled: value })}
              trackColor={{ false: '#374151', true: '#22c55e80' }}
              thumbColor={settings.hapticEnabled ? '#22c55e' : '#9ca3af'}
            />
          </View>
          
          {settings.feedbackEnabled && (
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <View style={styles.volumeButtons}>
                {[0.3, 0.5, 0.8, 1.0].map((vol) => (
                  <TouchableOpacity
                    key={vol}
                    style={[
                      styles.volumeButton,
                      settings.feedbackVolume === vol && styles.volumeButtonActive,
                    ]}
                    onPress={() => updateSettings({ feedbackVolume: vol })}
                  >
                    <Text style={[
                      styles.volumeButtonText,
                      settings.feedbackVolume === vol && styles.volumeButtonTextActive,
                    ]}>
                      {Math.round(vol * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          <TouchableOpacity style={styles.testButton} onPress={testFeedback}>
            <Text style={styles.testButtonText}>Test Feedback</Text>
          </TouchableOpacity>
        </View>
        
        {/* Threshold Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wrist Error Thresholds</Text>
          <Text style={styles.sectionDescription}>
            Configure the thresholds for rating your impact position accuracy
          </Text>
          
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdInfo}>
              <View style={[styles.ratingBadge, styles.ratingGreat]}>
                <Text style={styles.ratingText}>Great</Text>
              </View>
              <Text style={styles.thresholdDescription}>
                Error ≤ this value
              </Text>
            </View>
            <View style={styles.thresholdInput}>
              <TextInput
                style={styles.input}
                value={settings.wristErrorThresholds.great.toString()}
                onChangeText={(value) => updateThreshold('great', value)}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputUnit}>°</Text>
            </View>
          </View>
          
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdInfo}>
              <View style={[styles.ratingBadge, styles.ratingOk]}>
                <Text style={styles.ratingText}>OK</Text>
              </View>
              <Text style={styles.thresholdDescription}>
                Error ≤ this value (above = "Off")
              </Text>
            </View>
            <View style={styles.thresholdInput}>
              <TextInput
                style={styles.input}
                value={settings.wristErrorThresholds.ok.toString()}
                onChangeText={(value) => updateThreshold('ok', value)}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputUnit}>°</Text>
            </View>
          </View>
          
          <View style={styles.thresholdPreview}>
            <Text style={styles.previewTitle}>Rating Preview</Text>
            <Text style={styles.previewText}>
              <Text style={{ color: '#22c55e' }}>Great</Text>: 0° - {settings.wristErrorThresholds.great}°
            </Text>
            <Text style={styles.previewText}>
              <Text style={{ color: '#f59e0b' }}>OK</Text>: {settings.wristErrorThresholds.great}° - {settings.wristErrorThresholds.ok}°
            </Text>
            <Text style={styles.previewText}>
              <Text style={{ color: '#ef4444' }}>Off</Text>: &gt; {settings.wristErrorThresholds.ok}°
            </Text>
          </View>
        </View>
        
        {/* Reset */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
        
        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <MetricRow label="App Version" value="1.0.0" />
          <MetricRow label="SDK" value="Expo 54" />
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  calibrationInfo: {
    backgroundColor: '#22c55e20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  calibrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calibrationDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  calibrationDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  calibrationWarning: {
    backgroundColor: '#f59e0b20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  calibrationWarningText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  calibrateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  calibrateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    color: '#ffffff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  volumeRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  volumeLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  volumeButton: {
    flex: 1,
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  volumeButtonActive: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  volumeButtonText: {
    fontSize: 13,
    color: '#6b7280',
  },
  volumeButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  testButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2d',
  },
  thresholdInfo: {
    flex: 1,
  },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  ratingGreat: {
    backgroundColor: '#22c55e20',
  },
  ratingOk: {
    backgroundColor: '#f59e0b20',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  thresholdDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  thresholdInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
    minWidth: 60,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  thresholdPreview: {
    backgroundColor: '#1e1e2d',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  resetButton: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
