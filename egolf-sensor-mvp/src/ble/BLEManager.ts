/**
 * BLE Manager for eGolf Sensor MVP
 * 
 * Handles BLE scanning, connection management, and device communication.
 * Uses react-native-ble-plx for Android BLE operations.
 * 
 * TODO: When WT9011DCL arrives:
 * 1. Update WT9011DCL_CONFIG with actual UUIDs
 * 2. Implement packet parsing in BLESensorAdapter
 * 3. Test connection stability and data rates
 */

import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { 
  BLEState, 
  BLEConnectionState, 
  DiscoveredDevice, 
  WT9011DCL_CONFIG 
} from '../types/ble';

/**
 * Callback types
 */
export type BLEStateCallback = (state: BLEState) => void;
export type DeviceDiscoveredCallback = (device: DiscoveredDevice) => void;
export type DataReceivedCallback = (data: Uint8Array) => void;

/**
 * BLE Manager singleton
 */
class BLEManagerClass {
  private manager: BleManager;
  private state: BLEState = {
    connectionState: 'disconnected',
    connectedDevice: null,
    discoveredDevices: [],
    isScanning: false,
    error: null,
    signalQuality: 0,
  };
  
  private stateListeners: Set<BLEStateCallback> = new Set();
  private dataListeners: Set<DataReceivedCallback> = new Set();
  private scanSubscription: any = null;
  private monitorSubscription: any = null;
  
  constructor() {
    this.manager = new BleManager();
    this.setupBLEStateMonitor();
  }
  
  /**
   * Set up BLE state monitoring (powered on/off, etc.)
   */
  private setupBLEStateMonitor(): void {
    this.manager.onStateChange((state) => {
      console.log('[BLE] State changed:', state);
      if (state === State.PoweredOff) {
        this.updateState({ 
          connectionState: 'disconnected',
          error: 'Bluetooth is turned off',
        });
      }
    }, true);
  }
  
  /**
   * Request necessary permissions for BLE on Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    
    try {
      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      if (Platform.Version >= 31) {
        const scanPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan Permission',
            message: 'eGolf Sensor needs to scan for nearby sensors.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        const connectPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect Permission',
            message: 'eGolf Sensor needs to connect to your sensor device.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (scanPermission !== PermissionsAndroid.RESULTS.GRANTED ||
            connectPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          this.updateState({ error: 'Bluetooth permissions denied' });
          return false;
        }
      }
      
      // Location permission required for BLE scanning
      const locationPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'eGolf Sensor needs location access for Bluetooth scanning.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (locationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        this.updateState({ error: 'Location permission denied' });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[BLE] Permission request error:', error);
      this.updateState({ error: 'Failed to request permissions' });
      return false;
    }
  }
  
  /**
   * Start scanning for BLE devices
   */
  async startScan(filterForSensor: boolean = true): Promise<void> {
    // Check permissions
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      return;
    }
    
    // Check BLE state
    const bleState = await this.manager.state();
    if (bleState !== State.PoweredOn) {
      this.updateState({ 
        error: 'Bluetooth is not powered on',
        connectionState: 'error',
      });
      return;
    }
    
    // Stop any existing scan
    await this.stopScan();
    
    // Clear previous devices
    this.updateState({ 
      discoveredDevices: [],
      isScanning: true,
      connectionState: 'scanning',
      error: null,
    });
    
    console.log('[BLE] Starting scan...');
    
    // Start scanning
    this.manager.startDeviceScan(
      null, // Scan for all services (or specify WT9011DCL_CONFIG.SERVICE_UUID)
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('[BLE] Scan error:', error);
          this.updateState({ 
            error: error.message,
            isScanning: false,
            connectionState: 'error',
          });
          return;
        }
        
        if (device) {
          this.handleDiscoveredDevice(device, filterForSensor);
        }
      }
    );
    
    // Auto-stop scan after 30 seconds
    setTimeout(() => {
      if (this.state.isScanning) {
        this.stopScan();
      }
    }, 30000);
  }
  
  /**
   * Handle a discovered device
   */
  private handleDiscoveredDevice(device: Device, filterForSensor: boolean): void {
    // Filter by name if requested
    if (filterForSensor) {
      const name = device.name || device.localName || '';
      const matchesPattern = WT9011DCL_CONFIG.NAME_PATTERNS.some(
        pattern => name.toLowerCase().includes(pattern.toLowerCase())
      );
      
      // Also include devices with no name for debugging
      if (!matchesPattern && name !== '') {
        return;
      }
    }
    
    const discoveredDevice: DiscoveredDevice = {
      id: device.id,
      name: device.name || device.localName || 'Unknown Device',
      rssi: device.rssi,
      device,
      discoveredAt: Date.now(),
    };
    
    // Update or add device to list
    const existingIndex = this.state.discoveredDevices.findIndex(
      d => d.id === device.id
    );
    
    let updatedDevices: DiscoveredDevice[];
    if (existingIndex >= 0) {
      updatedDevices = [...this.state.discoveredDevices];
      updatedDevices[existingIndex] = discoveredDevice;
    } else {
      updatedDevices = [...this.state.discoveredDevices, discoveredDevice];
      console.log('[BLE] New device found:', discoveredDevice.name, discoveredDevice.id);
    }
    
    this.updateState({ discoveredDevices: updatedDevices });
  }
  
  /**
   * Stop scanning
   */
  async stopScan(): Promise<void> {
    console.log('[BLE] Stopping scan');
    this.manager.stopDeviceScan();
    this.updateState({ 
      isScanning: false,
      connectionState: this.state.connectedDevice ? 'connected' : 'disconnected',
    });
  }
  
  /**
   * Connect to a device
   */
  async connect(deviceId: string): Promise<boolean> {
    try {
      await this.stopScan();
      
      this.updateState({ 
        connectionState: 'connecting',
        error: null,
      });
      
      console.log('[BLE] Connecting to:', deviceId);
      
      // Connect to device
      const device = await this.manager.connectToDevice(deviceId, {
        timeout: 10000, // 10 second timeout
      });
      
      console.log('[BLE] Connected, discovering services...');
      
      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      
      // Get the discovered device info
      const discoveredDevice = this.state.discoveredDevices.find(
        d => d.id === deviceId
      );
      
      this.updateState({
        connectionState: 'connected',
        connectedDevice: discoveredDevice || {
          id: deviceId,
          name: device.name || 'Unknown',
          rssi: device.rssi,
          device,
          discoveredAt: Date.now(),
        },
        signalQuality: this.rssiToQuality(device.rssi),
      });
      
      // Set up disconnection listener
      device.onDisconnected((error, disconnectedDevice) => {
        console.log('[BLE] Device disconnected:', error?.message);
        this.updateState({
          connectionState: 'disconnected',
          connectedDevice: null,
          signalQuality: 0,
        });
      });
      
      // Start monitoring for data
      await this.startDataMonitoring(device);
      
      return true;
    } catch (error: any) {
      console.error('[BLE] Connection error:', error);
      this.updateState({
        connectionState: 'error',
        error: error.message || 'Connection failed',
      });
      return false;
    }
  }
  
  /**
   * Start monitoring characteristic for data notifications
   * 
   * TODO: Update with actual WT9011DCL characteristic UUIDs when device arrives
   */
  private async startDataMonitoring(device: Device): Promise<void> {
    try {
      // TODO: Replace with actual characteristic from WT9011DCL
      const serviceUUID = WT9011DCL_CONFIG.SERVICE_UUID;
      const charUUID = WT9011DCL_CONFIG.CHARACTERISTICS.DATA_NOTIFY;
      
      console.log('[BLE] Starting data monitoring on', charUUID);
      
      this.monitorSubscription = device.monitorCharacteristicForService(
        serviceUUID,
        charUUID,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] Monitor error:', error);
            return;
          }
          
          if (characteristic?.value) {
            // Decode base64 value to bytes
            const data = this.base64ToBytes(characteristic.value);
            this.notifyDataListeners(data);
          }
        }
      );
    } catch (error) {
      console.log('[BLE] Could not start monitoring - service/char may not exist:', error);
      // This is expected until we have the real device
    }
  }
  
  /**
   * Disconnect from current device
   */
  async disconnect(): Promise<void> {
    if (!this.state.connectedDevice) {
      return;
    }
    
    try {
      this.updateState({ connectionState: 'disconnecting' });
      
      if (this.monitorSubscription) {
        this.monitorSubscription.remove();
        this.monitorSubscription = null;
      }
      
      await this.manager.cancelDeviceConnection(this.state.connectedDevice.id);
      
      this.updateState({
        connectionState: 'disconnected',
        connectedDevice: null,
        signalQuality: 0,
      });
    } catch (error: any) {
      console.error('[BLE] Disconnect error:', error);
      this.updateState({
        connectionState: 'disconnected',
        connectedDevice: null,
        error: error.message,
      });
    }
  }
  
  /**
   * Get current BLE state
   */
  getState(): BLEState {
    return { ...this.state };
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(callback: BLEStateCallback): () => void {
    this.stateListeners.add(callback);
    // Immediately notify with current state
    callback(this.getState());
    return () => {
      this.stateListeners.delete(callback);
    };
  }
  
  /**
   * Subscribe to data notifications
   */
  onData(callback: DataReceivedCallback): () => void {
    this.dataListeners.add(callback);
    return () => {
      this.dataListeners.delete(callback);
    };
  }
  
  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<BLEState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateListeners();
  }
  
  private notifyStateListeners(): void {
    const state = this.getState();
    this.stateListeners.forEach(cb => cb(state));
  }
  
  private notifyDataListeners(data: Uint8Array): void {
    this.dataListeners.forEach(cb => cb(data));
  }
  
  /**
   * Convert RSSI to quality percentage
   */
  private rssiToQuality(rssi: number | null): number {
    if (rssi === null) return 0;
    // RSSI typically ranges from -100 (weak) to -30 (strong)
    const normalized = Math.min(100, Math.max(0, (rssi + 100) * 1.4));
    return Math.round(normalized);
  }
  
  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopScan();
    this.disconnect();
    this.manager.destroy();
  }
}

// Export singleton instance
export const BLEManager = new BLEManagerClass();
