/**
 * eGolf Sensor MVP
 * 
 * Golf swing training aid sensor app for Android.
 * Uses BLE to connect to WT9011DCL IMU sensor (or simulated data).
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation';
import { SensorProvider } from './src/context';

// Ignore specific warnings that are not relevant
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SensorProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            <AppNavigator />
          </View>
        </SensorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
});
