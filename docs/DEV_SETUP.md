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
| Physical phone (Expo Go) | Your computer's LAN IP, e.g. `192.168.1.10` |
| Android emulator | `10.0.2.2` |
| iOS simulator | `localhost` |
| Web browser | `localhost` |

To find your LAN IP: `hostname -I` (Linux), `ipconfig getifaddr en0` (macOS), `ipconfig` (Windows).

Example `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=192.168.1.10
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

5. Deploy the security rules and indexes:

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <your-project-id>
   ```

   Do this **before** using the app. Until the rules are deployed, Firestore rejects every write: sign-up appears to work, but profiles and events are never saved. The index (in `firestore.indexes.json`) is what the map's nearby-events query needs; it takes a few minutes to build after the first deploy.

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

## Optional: Apple and Google sign-in

Email/password and the dev users work without any of this. The social buttons need extra setup, and neither works inside Expo Go on a phone: they need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) with your own app identifiers. First add `"bundleIdentifier"` under `expo.ios` and `"package"` under `expo.android` in `app.json` (for example `com.yourname.bwhere`), then build with `npx expo run:ios` / `npx expo run:android`.

**Google** (Android, iOS, web)

1. Firebase console → Authentication → Sign-in method → enable **Google**.
2. Google Cloud console (same project) → APIs & Services → Credentials. You need one OAuth client ID per platform:
   - **Web**: Firebase already created one ("Web client (auto created by Google Service)"). For web testing, add `http://localhost:8081` to its authorized JavaScript origins.
   - **iOS**: create an iOS client with your bundle identifier.
   - **Android**: create an Android client with your package name and your debug keystore's SHA-1 (`cd android && ./gradlew signingReport` after the first `expo run:android`).
3. Put them in `.env.local` (see `.env.example`): `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

Until the current platform's client ID is set, the Google button shows a "not set up yet" message instead of crashing.

**Apple** (iOS only)

1. You need a paid Apple Developer account. The `expo-apple-authentication` plugin in `app.json` adds the Sign in with Apple capability to the build.
2. Firebase console → Authentication → Sign-in method → enable **Apple**, and register your iOS app (bundle identifier) under Project settings.
3. Build with `npx expo run:ios` on a device or simulator signed in to an Apple ID.

The Apple button only appears on iOS devices that support it. Android and web don't show it.

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
| `auth/network-request-failed` or Firestore hangs offline | Check the emulators are running and `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` matches your device type (table in step 3). On a phone, check the firewall and that both devices share a network. |
| `permission-denied` errors, or nothing gets saved | With a real project, deploy the rules (Option B, step 5). Otherwise make sure you're signed in. |
| `The query requires an index` | Run the deploy in Option B, step 5, and wait a few minutes for the index to build |
| Emulators fail to start | Install Java 11+, and make sure ports 8080, 9099 and 4000 are free |
| Expo Go says the project is incompatible | Update Expo Go to the version that supports SDK 58 |
| Map is blank on Android | The Expo Go client includes a Maps key. A custom development build needs its own Google Maps API key. |
