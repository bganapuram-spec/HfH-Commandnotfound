# Saathi – React Native (Expo) app

This is the **React Native** version of the Saathi accessibility navigation app. The **backend is unchanged**: the same Express server in `../Server` is used for routes and AI.

## What was converted

| Web (React)           | Mobile (React Native)                          |
|-----------------------|------------------------------------------------|
| `navigator.geolocation` | `expo-location`                               |
| Google Maps JS + Directions | `react-native-maps` (polyline from ORS only) |
| `getUserMedia` + &lt;video&gt; | `expo-camera` (CameraView)                 |
| TensorFlow.js COCO-SSD | Placeholder (add backend image API or TF RN later) |
| `speechSynthesis`     | `expo-speech`                                 |
| CSS / className       | `StyleSheet` / React Native components         |

## Backend (unchanged)

- **Server:** `Saathi/Server` – Express, same API.
- **Endpoints:**  
  - `POST /api/route` – body: `{ start, end, safeMode }`  
  - `POST /api/ai/chat` – body: `{ messages, context }`

Make sure the server runs on the same host/port you use in the app (default `http://localhost:3000`).

## Run the backend

```bash
cd Saathi/Server
npm install
# Set ORS_API_KEY and LLM_API_KEY in .env if needed
npm start
```

Server runs at `http://localhost:3000` (or `PORT` from `.env`).

## Run the React Native app

```bash
cd Saathi/Mobile
npm install
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator (or scan QR with Expo Go).

### API URL when not on same machine

- **iOS Simulator:** `http://localhost:3000` is fine.
- **Android Emulator:** Use `http://10.0.2.2:3000` (or set `EXPO_PUBLIC_API_URL` or `extra.apiUrl` in `app.json`).
- **Physical device:** Use your computer’s LAN IP, e.g. `http://192.168.1.5:3000`, and ensure phone and PC are on the same network.

Set the base URL in `src/config.js` or via `app.json` → `extra.apiUrl` / env `EXPO_PUBLIC_API_URL`.

### Assets

If Expo complains about missing icon/splash, add under `assets/`:

- `icon.png` (e.g. 1024×1024)
- `splash-icon.png`
- `adaptive-icon.png` (Android)

Or remove/comment the `icon` and `splash` entries in `app.json` to rely on Expo defaults if available.

## Object detection on mobile

The web app used TensorFlow.js COCO-SSD in the browser. The mobile app currently uses a **placeholder** that returns no detections. To get real object detection:

1. **Backend:** Add an endpoint that accepts an image and returns detections (e.g. run COCO-SSD or another model on the server), then call it from the Camera component with a captured frame.
2. **On-device:** Use a React Native–compatible stack (e.g. `@tensorflow/tfjs-react-native` + a compatible model) and plug it into `src/Services/detection.js`.

Proximity alerts (expo-speech) will work as soon as `detectedObjects` is populated.
