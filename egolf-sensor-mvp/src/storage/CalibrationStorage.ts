/**
 * Calibration Storage Module
 * 
 * Handles persistent storage of Impact Neutral Calibration baseline
 * and app settings.
 */

import * as FileSystem from 'expo-file-system/legacy';
import {
  ImpactNeutralBaseline,
  AppSettings,
  DEFAULT_APP_SETTINGS,
} from '../types/calibration';

// Storage paths
const STORAGE_DIR = `${FileSystem.documentDirectory}calibration/`;
const BASELINE_PATH = `${STORAGE_DIR}impact_neutral_baseline.json`;
const SETTINGS_PATH = `${STORAGE_DIR}app_settings.json`;

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
  }
}

// ============ Impact Neutral Baseline ============

/**
 * Save Impact Neutral Calibration baseline
 */
export async function saveImpactNeutralBaseline(
  baseline: ImpactNeutralBaseline
): Promise<void> {
  await ensureStorageDir();
  await FileSystem.writeAsStringAsync(
    BASELINE_PATH,
    JSON.stringify(baseline, null, 2)
  );
}

/**
 * Load Impact Neutral Calibration baseline
 * Returns null if not calibrated yet
 */
export async function loadImpactNeutralBaseline(): Promise<ImpactNeutralBaseline | null> {
  try {
    const info = await FileSystem.getInfoAsync(BASELINE_PATH);
    if (!info.exists) {
      return null;
    }
    const content = await FileSystem.readAsStringAsync(BASELINE_PATH);
    return JSON.parse(content) as ImpactNeutralBaseline;
  } catch (error) {
    console.error('Failed to load impact neutral baseline:', error);
    return null;
  }
}

/**
 * Check if Impact Neutral calibration exists
 */
export async function hasImpactNeutralCalibration(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(BASELINE_PATH);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Clear Impact Neutral calibration
 */
export async function clearImpactNeutralBaseline(): Promise<void> {
  try {
    await FileSystem.deleteAsync(BASELINE_PATH, { idempotent: true });
  } catch (error) {
    console.error('Failed to clear impact neutral baseline:', error);
  }
}

// ============ App Settings ============

/**
 * Save app settings
 */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await ensureStorageDir();
  await FileSystem.writeAsStringAsync(
    SETTINGS_PATH,
    JSON.stringify(settings, null, 2)
  );
}

/**
 * Load app settings (returns defaults if not saved)
 */
export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_PATH);
    if (!info.exists) {
      return DEFAULT_APP_SETTINGS;
    }
    const content = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    const saved = JSON.parse(content) as Partial<AppSettings>;
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_APP_SETTINGS, ...saved };
  } catch (error) {
    console.error('Failed to load app settings:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Reset app settings to defaults
 */
export async function resetAppSettings(): Promise<void> {
  await saveAppSettings(DEFAULT_APP_SETTINGS);
}
