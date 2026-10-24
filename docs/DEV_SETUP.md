# Development setup

This guide takes you from a fresh clone to the app running in development mode on a phone, emulator or simulator.

The app is an Expo (SDK 58) / React Native project using Expo Router, with Firebase Auth (email + password) and Firestore as the backend. You can run it against **local Firebase emulators** (recommended, no Firebase account needed) or a **real Firebase project**.

---

## 1. Install the prerequisites

| Tool | Why | Check |
|---|---|---|
| Node.js 20+ (22 LTS recommended) | Runs Expo and npm | `node -v` |
| Java 11+ (21 recommended) | Required by the Firebase emulators | `java -version` |
| Git | Clone the repo | `git --version` |

Then pick at least one place to run the app:

- **Physical phone**: install **Expo Go** from the App Store / Play Store. The phone and your computer must be on the same Wi‑Fi network.
- **Android emulator**: install Android Studio and create a virtual device (AVD).
- **iOS simulator** (macOS only): install Xcode and its simulator.

Optional: in VS Code, install the recommended **Expo Tools** extension (VS Code will prompt you, see `.vscode/extensions.json`).

## 2. Clone and install dependencies

```bash
git clone <repo-url> bwhere
cd bwhere
npm install
```

## 3. Create your environment file

The app reads its Firebase settings from `.env.local`, which is git-ignored. Start from the template:

```bash
cp .env.example .env.local
```

Now choose **Option A** or **Option B** below. Don't set both.

> Variables prefixed with `EXPO_PUBLIC_` are baked in when the bundle is built. After changing `.env.local`, restart Expo with a cleared cache: `npx expo start -c`.

### Option A: local emulators (recommended for development)

Leave all the `EXPO_PUBLIC_FIREBASE_*` keys empty and set only the emulator host. Which value to use depends on where the app runs:

| Running the app on | `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` |
|---|---|
| Physical phone (Expo Go) | `auto` (recommended), or your computer's LAN IP, e.g. `192.168.1.10` |
| Android emulator | `10.0.2.2` |
| iOS simulator | `auto` or `localhost` |
| Web browser | `localhost` |

`auto` makes the app use the same host it loaded the JavaScript bundle from (the machine running Metro, which is also where the emulators run), so it keeps working when your LAN IP changes. On a physical phone, `localhost` is treated the same way, since it would otherwise point at the phone itself. `auto` does not work with `npx expo start --tunnel`; use your LAN IP then (the phone still needs to reach your computer on ports 8080 and 9099).

To find your LAN IP: `hostname -I` (Linux), `ipconfig getifaddr en0` (macOS), `ipconfig` (Windows).

Example `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=auto
```

When this variable is set, the app uses the project id `demo-b` and connects to Auth on port `9099` and Firestore on port `8080` (see `src/lib/firebase.ts`).

### Option B: a real Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a project.
2. **Build → Authentication → Sign-in method**: enable **Email/Password**.
3. **Build → Firestore Database**: create a database.
4. **Project settings → Your apps**: add a **Web app** and copy its config values into `.env.local`:

   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

   These are public client keys. Data is protected by `firestore.rules`, so deploy those rules (next step).

5. Deploy the security rules:

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   ```

6. **Composite index:** the map query for nearby public events filters on `visibility` and orders by `geohash`, which needs a composite index on a real project. The first time it runs, Firestore logs an error with a link that creates the index. Open it, wait for the index to finish building, then reload the app. (The emulators don't need indexes.)

## 4. Start the Firebase emulators (Option A only)

In a **separate terminal**, from the project root:

```bash
npx firebase-tools emulators:start --project demo-b
```

- The emulators listen on all interfaces (`0.0.0.0`), so a phone on your LAN can reach them. If a phone can't connect, allow ports `8080` and `9099` through your firewall.
- The Emulator UI (usually http://localhost:4000) lets you browse users and Firestore data.
- `firestore.rules` is loaded automatically, so access rules behave as they do in production.
- Data is wiped when the emulators stop. To keep it between sessions:

  ```bash
  npx firebase-tools emulators:start --project demo-b --import=./emulator-data --export-on-exit
  ```

Keep this terminal running while you develop.

## 5. Start the app in development mode

In another terminal:

```bash
npm start            # same as: npx expo start
```

This starts the Metro dev server and prints a QR code. Then:

| Target | How |
|---|---|
| Physical phone | Scan the QR code with the camera (iOS) or the Expo Go app (Android) |
| Android emulator | Press `a` in the Expo terminal, or run `npm run android` |
| iOS simulator | Press `i`, or run `npm run ios` |
| Web | Press `w`, or run `npm run web` |

If your phone can't reach Metro (different network, strict Wi‑Fi), use a tunnel: `npx expo start --tunnel`.

## 6. Verify everything works

1. The app opens on the **login** screen.
2. Create an account with any email and password (6+ characters). With the emulators, the user appears in the Emulator UI under Authentication.
3. Allow the **location** permission when asked. The map tab centers on your position.
4. Create an event from the **Create** tab and check it shows on the map.

## Day-to-day development

- **Fast Refresh** is on: saving a file under `src/` updates the running app instantly.
- **Dev menu**: shake the device, or press `m` in the Expo terminal. Use it to reload or open the debugger.
- **Reload**: press `r` in the Expo terminal.
- **Debugger**: press `j` in the Expo terminal to open React Native DevTools.
- **Lint**: `npm run lint`
- **Type check**: `npx tsc --noEmit`
- Routes live in `src/app/` (file-based routing); Firebase helpers live in `src/lib/`.

Typical session (Option A): terminal 1 runs the emulators, terminal 2 runs `npm start`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Changes to `.env.local` have no effect | Restart with `npx expo start -c` |
| "No connection. Try again." / "Can't reach the Firebase emulator", `auth/network-request-failed`, or Firestore hangs offline | Check the emulators are running (step 4) and `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` matches your device type (table in step 3), then restart with `npx expo start -c`. On a phone, check the firewall allows ports 8080 and 9099, that both devices share a network, and that Expo Go has **Local Network** access (iOS Settings → Privacy & Security → Local Network). |
| `permission-denied` errors | Rules are working as designed: make sure you're signed in. With a real project, check the rules were deployed. |
| `The query requires an index` | Open the link in the error to create the index (Option B, step 3.6) |
| Emulators fail to start | Install Java 11+, and make sure ports 8080, 9099 and 4000 are free |
| Expo Go says the project is incompatible | Update Expo Go to the version that supports SDK 58 |
| Map is blank on Android | The Expo Go client includes a Maps key. A custom development build needs its own Google Maps API key. |
