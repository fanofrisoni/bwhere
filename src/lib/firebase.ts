import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { initializeApp } from 'firebase/app';
// @ts-expect-error exported only by the react-native build Metro resolves; firebase's top-level `types` hides it from tsc.
import { connectAuthEmulator, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';

// The machine running Metro (e.g. "192.168.1.10" from "192.168.1.10:8081"); the emulators run there too.
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
const isLoopback = (host: string) => host === 'localhost' || host === '127.0.0.1';

// "auto" (or a loopback host on a physical phone, where it can never work) means: use the same host as Metro,
// so a phone keeps working when your LAN IP changes. Any other value is used as is (e.g. 10.0.2.2 for the Android emulator).
function resolveEmulatorHost(configured: string | undefined) {
  if (!configured) return undefined;
  if (configured === 'auto' || (isLoopback(configured) && Device.isDevice)) return metroHost ?? configured;
  return configured;
}

export const emulatorHost = resolveEmulatorHost(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST);

// Values come from .env.local (EXPO_PUBLIC_* is inlined at build time; these are public client keys, security lives in firestore.rules).
const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? (emulatorHost && 'emulator'),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? (emulatorHost && 'demo-b'),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

// Persist the session across app restarts (default in-memory persistence logs users out).
export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
// React Native can't hold Firestore's default streaming (WebChannel) connection open, which shows up as
// "Could not reach Cloud Firestore backend" / "client is offline". Long polling works everywhere.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });

if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
