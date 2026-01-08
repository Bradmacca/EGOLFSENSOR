# eGolf Sensor MVP

A React Native Expo app for golf swing training using an IMU sensor (WT9011DCL or similar).

## Features

- **BLE Connection**: Scan and connect to Bluetooth Low Energy IMU sensors
- **Simulated Sensor**: Test the app without hardware using realistic simulated swing data
- **Live Visualization**: Real-time wrist angle gauge and sensor metrics
- **Recording**: Record swing sessions at up to 200Hz sample rate
- **Swing Detection**: Automatic detection of swing events (Start, Top, Impact)
- **Session Management**: View, analyze, and export recorded sessions
- **Export**: Share session data as CSV or JSONL files

## Screenshots

The app has 4 main screens:

1. **Connect** - Scan for BLE devices or enable simulated sensor
2. **Live** - Real-time sensor visualization with wrist angle gauge
3. **Record** - Record swing sessions with live timer and event detection
4. **Sessions** - Browse, analyze, and export recorded sessions

## Requirements

- Node.js 18+
- Android SDK (for local builds)
- Android device or emulator with Bluetooth support
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Quick Start (Android Dev Build)

### Step 1: Install Dependencies

```bash
cd egolf-sensor-mvp
npm install
```

### Step 2: Create Development Build

Since this app uses native modules (BLE), you need a development build instead of Expo Go.

**Option A: Build locally (requires Android SDK)**

```bash
# Generate native Android project
npx expo prebuild

# Build and run on connected device/emulator
npx expo run:android
```

**Option B: Build with EAS (cloud)**

First, install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

Create development build:

```bash
# Initialize EAS project
eas build:configure

# Build for Android (development)
eas build -p android --profile development
```

Download and install the APK on your device.

### Step 3: Run the App

Once you have a development build installed:

```bash
# Start the development server
npm start

# The dev client app will connect to this server
```

## Project Structure

```
egolf-sensor-mvp/
├── src/
│   ├── ble/                    # BLE management and sensor adapter
│   │   ├── BLEManager.ts       # BLE scanning, connection management
│   │   └── BLESensorAdapter.ts # BLE to SensorAdapter bridge
│   ├── sensors/                # Sensor data handling
│   │   ├── SensorAdapter.ts    # Adapter interface for sensors
│   │   ├── SimulatedSensor.ts  # Simulated sensor for testing
│   │   └── SwingDetector.ts    # Swing event detection algorithm
│   ├── storage/                # Session storage
│   │   └── SessionStorage.ts   # JSONL/JSON/CSV file operations
│   ├── screens/                # App screens
│   │   ├── ConnectScreen.tsx   # BLE scan & simulator toggle
│   │   ├── LiveScreen.tsx      # Real-time visualization
│   │   ├── RecordScreen.tsx    # Recording interface
│   │   ├── SessionsScreen.tsx  # Session list
│   │   └── SessionDetailScreen.tsx # Session analysis
│   ├── components/             # Reusable UI components
│   │   ├── WristAngleGauge.tsx # Semi-circular gauge
│   │   ├── GyroChart.tsx       # Gyro magnitude chart
│   │   ├── StatusChip.tsx      # Status indicator
│   │   └── ...
│   ├── context/                # React context providers
│   │   └── SensorContext.tsx   # Global sensor state
│   ├── navigation/             # React Navigation setup
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── App.tsx                     # App entry point
└── app.json                    # Expo configuration
```

## Data Model

### SensorSample

Each sensor reading contains:

```typescript
interface SensorSample {
  timestampMs: number;       // ms since recording start
  quat?: { w, x, y, z };     // Quaternion orientation
  euler?: { roll, pitch, yaw }; // Euler angles (degrees)
  accel: { x, y, z };        // Accelerometer (g)
  gyro: { x, y, z };         // Gyroscope (deg/s)
  mag: { x, y, z };          // Magnetometer (μT)
}
```

### Session Storage

Sessions are stored in the device's document directory:

```
sessions/
└── [session-id]/
    ├── metadata.json    # Session metadata + detected events
    ├── samples.jsonl    # Sensor samples (JSON Lines format)
    └── export.csv       # Generated on export
```

## TODO: WT9011DCL Integration

When the physical sensor arrives, the following needs to be implemented:

### 1. BLE UUIDs (src/types/ble.ts)

```typescript
// TODO: Replace with actual UUIDs from WT9011DCL documentation
export const WT9011DCL_CONFIG = {
  SERVICE_UUID: '????-????-????-????',
  CHARACTERISTICS: {
    DATA_NOTIFY: '????-????-????-????',
  },
};
```

### 2. Packet Parsing (src/ble/BLESensorAdapter.ts)

```typescript
// TODO: Implement parsePacket() with correct byte offsets and scaling
// Example WIT Motion packet format:
// - Byte 0: 0x55 (header)
// - Byte 1: Packet type
// - Bytes 2-7: 3x int16 data (little-endian)
// - Scaling: accel = raw/32768*16g, gyro = raw/32768*2000deg/s
```

### 3. Testing Steps

1. Install app with BLE permissions
2. Enable Bluetooth on device
3. Power on WT9011DCL sensor
4. Go to Connect screen
5. Tap "Scan for Devices"
6. Find and connect to sensor
7. Monitor BLE data in console logs
8. Adjust packet parsing based on actual data format

## Swing Detection Algorithm

The current v1 algorithm uses gyro magnitude thresholds:

1. **Swing Start**: Gyro magnitude > 100°/s for > 50ms
2. **Top of Backswing**: Local minimum after backswing peak
3. **Impact**: Largest gyro spike > 500°/s after transition

Parameters can be tuned in `src/sensors/SwingDetector.ts`.

## Export Formats

### JSONL (samples.jsonl)
One JSON object per line, efficient for streaming:
```json
{"timestampMs":0,"euler":{"roll":0.5,"pitch":-1.2,"yaw":45.3},"accel":{"x":0.1,"y":0.1,"z":1.0},"gyro":{"x":5.2,"y":-3.1,"z":12.4},"mag":{"x":20,"y":5,"z":40}}
{"timestampMs":10,"euler":{"roll":0.6,"pitch":-1.1,"yaw":45.5},...}
```

### CSV (export.csv)
Standard comma-separated values:
```csv
timestamp_ms,quat_w,quat_x,quat_y,quat_z,euler_roll,euler_pitch,euler_yaw,accel_x,accel_y,accel_z,gyro_x,gyro_y,gyro_z,mag_x,mag_y,mag_z
0,0.999,0.001,0.002,0.003,0.5,-1.2,45.3,0.1,0.1,1.0,5.2,-3.1,12.4,20,5,40
```

## Troubleshooting

### BLE Scanning Issues

1. Ensure Bluetooth is enabled on device
2. Grant all permission prompts (Bluetooth + Location)
3. Check that sensor is powered on and advertising
4. Try toggling Bluetooth off/on

### Build Errors

```bash
# Clean and rebuild
npx expo prebuild --clean
npx expo run:android
```

### Performance Issues

- Reduce sample rate to 100Hz if experiencing drops
- Close other BLE-using apps
- Ensure device has adequate battery

## License

MIT

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with TypeScript types
4. Test with simulated sensor
5. Submit pull request
