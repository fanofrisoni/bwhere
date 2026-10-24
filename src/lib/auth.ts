import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db } from '@/lib/firebase';

export async function createUserDoc(user: User, displayName: string) {
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email: user.email?.toLowerCase() ?? null,
    photoURL: user.photoURL ?? null,
    notifications: { eventInvites: true, nearbyEvents: true },
    createdAt: serverTimestamp(),
  });
}

// Social sign-in can be a first login, so make sure the profile doc friend search relies on exists.
export async function ensureUserDoc(user: User, displayName?: string) {
  if ((await getDoc(doc(db, 'users', user.uid))).exists()) return;
  const name = displayName || user.displayName || user.email?.split('@')[0] || 'New user';
  if (!user.displayName) await updateProfile(user, { displayName: name });
  await createUserDoc(user, name);
}

// Apple only returns the name on the very first authorization, so it's passed through to the profile doc.
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });
  if (!apple.identityToken) throw new Error('Apple did not return an identity token.');
  const credential = new OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce });
  const { user } = await signInWithCredential(auth, credential);
  const name = [apple.fullName?.givenName, apple.fullName?.familyName].filter(Boolean).join(' ');
  await ensureUserDoc(user, name);
}

export async function signInWithGoogleIdToken(idToken: string) {
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  await ensureUserDoc(user);
}

// OAuth client IDs from Google Cloud Console (see docs/DEV_SETUP.md); each platform needs its own.
export const googleClientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};

// expo-auth-session throws during render if the current platform's client ID is missing, so check first.
export const isGoogleConfigured = !!Platform.select({
  ios: googleClientIds.iosClientId,
  android: googleClientIds.androidClientId,
  default: googleClientIds.webClientId,
});

export const isSignInCancel = (e: any) => e?.code === 'ERR_REQUEST_CANCELED';
