import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
// @ts-expect-error exported only by the react-native build Metro resolves; firebase's top-level `types` hides it from tsc.
import { connectAuthEmulator, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Set to your machine's LAN IP (or 10.0.2.2 for the Android emulator) to use the local Firebase emulators.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;

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
export const db = getFirestore(app);

if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
