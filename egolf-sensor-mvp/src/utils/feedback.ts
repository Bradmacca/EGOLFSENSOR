/**
 * Audio and Haptic Feedback Utilities
 * 
 * Provides feedback during swing events when wrist error is within threshold.
 */

import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

// Sound object for reuse
let successSound: Audio.Sound | null = null;
let isAudioInitialized = false;

/**
 * Initialize audio system
 */
export async function initializeAudio(): Promise<void> {
  if (isAudioInitialized) return;
  
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isAudioInitialized = true;
  } catch (error) {
    console.warn('Failed to initialize audio:', error);
  }
}

/**
 * Play a success beep sound
 */
export async function playSuccessBeep(volume: number = 0.8): Promise<void> {
  try {
    await initializeAudio();
    
    // Create a simple beep using a generated tone
    // For production, you'd want to use an actual audio file
    if (!successSound) {
      // Use a simple sine wave beep
      // Note: In production, replace with an actual audio file asset
      const { sound } = await Audio.Sound.createAsync(
        // Using a data URI for a simple beep
        // In production, use: require('../assets/sounds/success.mp3')
        { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbX19fX18fHx8fHx8fHx8fHx8fHx8fHx8fHx8fX19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8' },
        { volume, shouldPlay: false }
      );
      successSound = sound;
    }
    
    await successSound.setVolumeAsync(volume);
    await successSound.setPositionAsync(0);
    await successSound.playAsync();
  } catch (error) {
    console.warn('Failed to play success beep:', error);
    // Fall back to haptic only
  }
}

/**
 * Trigger haptic feedback (vibration)
 */
export function triggerHaptic(pattern: 'light' | 'medium' | 'heavy' = 'medium'): void {
  try {
    if (Platform.OS === 'android') {
      const durations: Record<string, number> = {
        light: 50,
        medium: 100,
        heavy: 200,
      };
      Vibration.vibrate(durations[pattern]);
    } else if (Platform.OS === 'ios') {
      // iOS uses different vibration patterns
      Vibration.vibrate();
    }
  } catch (error) {
    console.warn('Failed to trigger haptic:', error);
  }
}

/**
 * Provide feedback for "Great" impact position
 * Called when wrist error is within threshold during impact
 */
export async function provideSuccessFeedback(
  options: {
    audioEnabled: boolean;
    hapticEnabled: boolean;
    volume: number;
  }
): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (options.audioEnabled) {
    promises.push(playSuccessBeep(options.volume));
  }
  
  if (options.hapticEnabled) {
    triggerHaptic('medium');
  }
  
  await Promise.all(promises);
}

/**
 * Provide feedback for "Off" impact position (warning)
 */
export function provideWarningFeedback(hapticEnabled: boolean): void {
  if (hapticEnabled) {
    // Double short vibration for warning
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 50, 50, 50]);
    } else {
      Vibration.vibrate();
    }
  }
}

/**
 * Cleanup audio resources
 */
export async function cleanupAudio(): Promise<void> {
  if (successSound) {
    await successSound.unloadAsync();
    successSound = null;
  }
  isAudioInitialized = false;
}
