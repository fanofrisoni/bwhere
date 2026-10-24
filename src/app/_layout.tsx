import { onAuthStateChanged, type User } from 'firebase/auth';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { auth } from '@/lib/firebase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // undefined = Firebase is still restoring the saved session; render nothing so login doesn't flash.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {user !== undefined && (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!user}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen name="login" />
            </Stack.Protected>
          </Stack>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
