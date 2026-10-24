import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { Region } from 'react-native-maps';

export const ZOOM = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
// Used when location permission is denied or unavailable.
const FALLBACK_REGION: Region = { latitude: 40.4168, longitude: -3.7038, ...ZOOM };

/** The user's current zone, or null while locating. */
export function useCurrentRegion() {
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setRegion(FALLBACK_REGION);
        const { coords } = await Location.getCurrentPositionAsync({});
        setRegion({ latitude: coords.latitude, longitude: coords.longitude, ...ZOOM });
      } catch {
        setRegion(FALLBACK_REGION);
      }
    })();
  }, []);

  return [region, setRegion] as const;
}
