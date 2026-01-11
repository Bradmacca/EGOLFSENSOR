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
  CalibrationPoints,
} from '../types/calibration';

// Storage paths
const STORAGE_DIR = `${FileSystem.documentDirectory}calibration/`;
const BASELINE_PATH = `${STORAGE_DIR}impact_neutral_baseline.json`;
const ADDRESS_PATH = `${STORAGE_DIR}address_reference.json`;
const IMPACT_PATH = `${STORAGE_DIR}impact_reference.json`;
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

// ============ Address and Impact Reference Points ============

/**
 * Save Address Reference (neutral position before swing)
 */
export async function saveAddressReference(
  baseline: ImpactNeutralBaseline
): Promise<void> {
  await ensureStorageDir();
  await FileSystem.writeAsStringAsync(
    ADDRESS_PATH,
    JSON.stringify(baseline, null, 2)
  );
}

/**
 * Load Address Reference
 * Returns null if not calibrated yet
 */
export async function loadAddressReference(): Promise<ImpactNeutralBaseline | null> {
  try {
    const info = await FileSystem.getInfoAsync(ADDRESS_PATH);
    if (!info.exists) {
      return null;
    }
    const content = await FileSystem.readAsStringAsync(ADDRESS_PATH);
    return JSON.parse(content) as ImpactNeutralBaseline;
  } catch (error) {
    console.error('Failed to load address reference:', error);
    return null;
  }
}

/**
 * Save Impact Reference (ideal impact position)
 */
export async function saveImpactReference(
  baseline: ImpactNeutralBaseline
): Promise<void> {
  await ensureStorageDir();
  await FileSystem.writeAsStringAsync(
    IMPACT_PATH,
    JSON.stringify(baseline, null, 2)
  );
  // Also save to legacy path for backward compatibility
  await saveImpactNeutralBaseline(baseline);
}

/**
 * Load Impact Reference
 * Returns null if not calibrated yet
 */
export async function loadImpactReference(): Promise<ImpactNeutralBaseline | null> {
  try {
    const info = await FileSystem.getInfoAsync(IMPACT_PATH);
    if (!info.exists) {
      // Fallback to legacy path
      return await loadImpactNeutralBaseline();
    }
    const content = await FileSystem.readAsStringAsync(IMPACT_PATH);
    return JSON.parse(content) as ImpactNeutralBaseline;
  } catch (error) {
    console.error('Failed to load impact reference:', error);
    // Fallback to legacy path
    return await loadImpactNeutralBaseline();
  }
}

/**
 * Load all calibration points (address and impact)
 */
export async function loadCalibrationPoints(): Promise<CalibrationPoints> {
  const [address, impact, neutral] = await Promise.all([
    loadAddressReference(),
    loadImpactReference(),
    loadImpactNeutralBaseline(), // Legacy support
  ]);
  
  return {
    address: address || undefined,
    impact: impact || undefined,
    neutral: neutral || undefined,
  };
}

/**
 * Clear Address Reference
 */
export async function clearAddressReference(): Promise<void> {
  try {
    await FileSystem.deleteAsync(ADDRESS_PATH, { idempotent: true });
  } catch (error) {
    console.error('Failed to clear address reference:', error);
  }
}

/**
 * Clear Impact Reference
 */
export async function clearImpactReference(): Promise<void> {
  try {
    await FileSystem.deleteAsync(IMPACT_PATH, { idempotent: true });
    // Also clear legacy path
    await clearImpactNeutralBaseline();
  } catch (error) {
    console.error('Failed to clear impact reference:', error);
  }
}

/**
 * Clear all calibration points
 */
export async function clearAllCalibrationPoints(): Promise<void> {
  await Promise.all([
    clearAddressReference(),
    clearImpactReference(),
    clearImpactNeutralBaseline(),
  ]);
}
