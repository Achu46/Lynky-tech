# Pocket Operator — Mobile (Android)

Android voice-driven food pickup assistant built with React Native CLI and TypeScript.

## Prerequisites

- Node.js 18+ (20+ recommended)
- JDK 17
- Android SDK (API 35 / build-tools 35.0.0) and `ANDROID_HOME` configured
- Android Emulator or physical Android device (Android 8.0+ / API 24+; tested build target SDK 34, compile SDK 35)
- Deployed HTTPS Pocket Operator backend (or local backend over LAN/emulator)

## Install

```bash
cd Mobile
npm install
```

## Configure `BACKEND_URL`

Edit [src/config.ts](src/config.ts):

```ts
export const BACKEND_URL = 'https://your-backend-url.up.railway.app';
```

- **Production / Deployed (HTTPS):** Set `BACKEND_URL` to your HTTPS Railway URL. `usesCleartextTraffic` is **not** enabled in `AndroidManifest.xml`.
- **Android Emulator + local HTTP backend:** Set `BACKEND_URL = 'http://10.0.2.2:3000'` and temporarily add `android:usesCleartextTraffic="true"` to `<application>` in `android/app/src/main/AndroidManifest.xml` (only for local HTTP testing; remove before release).
- **Physical device + local HTTP backend on LAN:** Set `BACKEND_URL = 'http://<your-computer-lan-ip>:3000'` with temporary `usesCleartextTraffic="true"`, or expose your local backend via an HTTPS tunnel.

## Run on Emulator / Device (Debug)

```bash
cd Mobile
npm start
# In another terminal:
npm run android
```

## Build Release APK

Release builds are signed with the debug keystore (`android/app/build.gradle`) for evaluation purposes:

```bash
cd Mobile/android
./gradlew assembleRelease
```

On Windows PowerShell:

```powershell
cd Mobile\android
.\gradlew.bat assembleRelease
```

Output APK path:

```text
Mobile/android/app/build/outputs/apk/release/app-release.apk
```

Install on a connected device/emulator:

```bash
adb install -r Mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Environment Tested

- Built and type-checked with React Native `0.76.9`, JDK `17.0.17`, Android SDK `compileSdk 35` / `targetSdk 34` / `minSdk 24`.
- Note: Interactive UI & hardware microphone / Google Maps flows should be verified on a physical Android device or Play-Store emulator using `MANUAL_TEST_CHECKLIST.md`.

## Known Limitations

- **Voice recognition on emulators without Google App:** Android speech recognition (`@react-native-voice/voice`, locale `en-IN`) requires Google Speech Services on the device. If unavailable, the app hides/disables the mic button and falls back cleanly to editable text input.
- **Orders without embedded coordinates:** `GET /api/orders` returns `restaurant_id` and `restaurant_name`; if an order's coordinates are not cached locally (e.g., fresh install), tapping **Open directions** in History resolves coordinates via `/api/agent/run` (`request_directions`).
- **Debug keystore signing:** Release APK uses the standard React Native debug keystore for evaluation only; do not publish to Play Store with this keystore.
