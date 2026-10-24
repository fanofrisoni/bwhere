import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { Image } from 'expo-image';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, ThemedInput } from '@/components/themed-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { auth, db, emulatorHost } from '@/lib/firebase';

async function register(email: string, password: string, displayName: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email: email.toLowerCase(),
    photoURL: null,
    notifications: { eventInvites: true, nearbyEvents: true },
    createdAt: serverTimestamp(),
  });
}

// Dev only: two fixed test accounts, created on first use, so private invites can be tested between them.
async function devLogin(n: 1 | 2) {
  const email = `dev${n}@b.test`;
  const password = 'dev-password';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e: any) {
    if (e.code !== 'auth/invalid-credential' && e.code !== 'auth/user-not-found') throw e;
    await register(email, password, `Dev User ${n}`);
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email looks invalid.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'No connection. Try again.',
};

// In dev, say which emulator the app tried to reach, since that's almost always why the request failed.
function errorMessage(e: any) {
  if (__DEV__ && emulatorHost && e.code === 'auth/network-request-failed') {
    return `Can't reach the Firebase emulator at ${emulatorHost}:9099. Is it running, and reachable from this device?`;
  }
  return MESSAGES[e.code] ?? e.message;
}

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === 'register';

  // The root layout swaps to the tabs as soon as auth state flips, so success needs no navigation here.
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const submit = () => {
    if (!email.trim() || !password || (isRegister && !name.trim())) return setError('Fill in all fields.');
    run(() =>
      isRegister
        ? register(email.trim(), password, name.trim())
        : signInWithEmailAndPassword(auth, email.trim(), password),
    );
  };

  return (
    <ThemedView gradient style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="b" />
            <ThemedText themeColor="textSecondary">"b" where you wanna be.</ThemedText>
          </View>

          {isRegister && (
            <ThemedInput placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />
          )}
          <ThemedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <ThemedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            onSubmitEditing={submit}
          />
          {error && (
            <ThemedText type="small" style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}
          <Button title={isRegister ? 'Create account' : 'Log in'} onPress={submit} loading={busy} />

          <Pressable onPress={() => (setMode(isRegister ? 'login' : 'register'), setError(null))} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary" style={styles.switch}>
              {isRegister ? 'Have an account? Log in' : 'New here? Create an account'}
            </ThemedText>
          </Pressable>

          {__DEV__ && (
            <View style={styles.dev}>
              <ThemedText type="small" themeColor="textSecondary">Dev mode</ThemedText>
              <Button variant="secondary" title="Dev User 1" onPress={() => run(() => devLogin(1))} disabled={busy} />
              <Button variant="secondary" title="Dev User 2" onPress={() => run(() => devLogin(2))} disabled={busy} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four },
  form: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  brand: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  logo: { width: 72, height: 96 },
  error: { color: '#D93025' },
  switch: { textAlign: 'center', padding: Spacing.two },
  dev: { gap: Spacing.two, marginTop: Spacing.four },
});
