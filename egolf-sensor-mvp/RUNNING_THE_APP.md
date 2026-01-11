# Running the App on Your Android Device

## Quick Start

The APK has been built successfully! Here's how to install and run it on your device:

## Step 1: Free Up Storage Space on Your Device

The installation failed because your device doesn't have enough storage space. You need to:
- Free up at least **50-100 MB** of storage space on your Android device
- The APK file is approximately **20-50 MB** (varies by build)

## Step 2: Install the App

Once you have space, you have two options:

### Option A: Automatic Installation (Recommended)
```powershell
npm run android
```
This will:
- Install the APK on your connected device
- Start Metro bundler (the JavaScript server)
- Open the app on your device

### Option B: Manual Installation

1. **Enable Developer Options on your Android device:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect your device via USB** and authorize USB debugging when prompted

3. **Install the APK:**
   ```powershell
   cd android
   .\gradlew.bat installDebug
   ```
   
   OR manually copy the APK to your device and install it:
   - APK location: `android\app\build\outputs\apk\debug\app-debug.apk`
   - Transfer it to your device via USB/email/cloud storage
   - Open it on your device to install

## Step 3: Start the Development Server

Once the app is installed, start Metro bundler:

```powershell
npm start
```

Or:
```powershell
expo start --dev-client
```

## Step 4: Open the App

1. The app should automatically open on your device
2. If not, find "eGolf Sensor" in your app drawer and open it
3. The app will connect to the Metro bundler running on your PC
4. Make sure your PC and phone are on the same WiFi network (or use USB debugging)

## Troubleshooting

### Device Not Detected
- Make sure USB debugging is enabled
- Check USB cable connection
- Try: `adb devices` (if adb is in your PATH)
- Restart ADB: `adb kill-server && adb start-server`

### App Won't Connect to Metro
- Make sure Metro bundler is running (`npm start`)
- Check that your PC and phone are on the same network
- Try shaking your device to open developer menu → "Configure Bundler"
- Enter your PC's IP address manually

### Build Errors
- If you get std::format errors again, run the patch script:
  ```powershell
  .\scripts\patch-react-native-gradle-cache.ps1
  ```

## Next Steps

Once the app is running:
- The app will hot-reload when you make code changes
- Shake your device to open the developer menu
- Use the Metro bundler terminal for logs and debugging
