import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, ThemedInput } from '@/components/themed-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  createUserDoc,
  ensureUserDoc,
  googleClientIds,
  isGoogleConfigured,
  isSignInCancel,
  signInWithApple,
  signInWithGoogleIdToken,
} from '@/lib/auth';
import { auth, emulatorHost } from '@/lib/firebase';

// Closes the Google popup and hands its result back to the app on web.
WebBrowser.maybeCompleteAuthSession();

async function register(email: string, password: string, displayName: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserDoc(user, displayName);
}

// Dev only: two fixed test accounts, created on first use, so private invites can be tested between them.
async function devLogin(n: 1 | 2) {
  const email = `dev${n}@b.test`;
  const password = 'dev-password';
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    // Covers accounts whose profile write failed earlier (e.g. before the rules were deployed).
    await ensureUserDoc(user, `Dev User ${n}`);
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
  'auth/account-exists-with-different-credential': 'This email already uses another sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
};

const googleIcon = <Image source={require('@/assets/images/google-g.svg')} style={{ width: 18, height: 18 }} />;

// Mounted only when configured: the Google hook throws during render without the platform's client ID.
function GoogleButton({ run, disabled }: { run: (action: () => Promise<unknown>) => void; disabled: boolean }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleClientIds);

  useEffect(() => {
    if (response?.type === 'success') run(() => signInWithGoogleIdToken(response.params.id_token));
  }, [response]);

  return (
    <Button
      variant="secondary"
      title="Continue with Google"
      icon={googleIcon}
      onPress={() => promptAsync()}
      disabled={disabled || !request}
    />
  );
}

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
  const [appleAvailable, setAppleAvailable] = useState(false);
  const scheme = useColorScheme();
  const theme = useTheme();
  const isRegister = mode === 'register';

  // Sign in with Apple is native-only (iOS 13+); other platforms just don't show the button.
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // The root layout swaps to the tabs as soon as auth state flips, so success needs no navigation here.
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      if (!isSignInCancel(e)) setError(errorMessage(e));
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
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
              // The ink logo would vanish on black, so dark mode draws it in the text color.
              tintColor={scheme === 'dark' ? theme.text : undefined}
              accessibilityLabel="b"
            />
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

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
            <ThemedText type="small" themeColor="textSecondary">or</ThemedText>
            <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={Radius.md}
              style={styles.apple}
              onPress={() => !busy && run(signInWithApple)}
            />
          )}
          {isGoogleConfigured ? (
            <GoogleButton run={run} disabled={busy} />
          ) : (
            <Button
              variant="secondary"
              title="Continue with Google"
              icon={googleIcon}
              onPress={() => setError('Google sign-in is not set up yet: add the Google client IDs to .env.local.')}
              disabled={busy}
            />
          )}

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
  logo: { width: 100, height: 120 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  apple: { height: 48 },
  error: { color: '#D93025' },
  switch: { textAlign: 'center', padding: Spacing.two },
  dev: { gap: Spacing.two, marginTop: Spacing.four },
});
