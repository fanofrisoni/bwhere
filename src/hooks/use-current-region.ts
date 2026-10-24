import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { Region } from 'react-native-maps';

export const ZOOM = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
// Used when location permission is denied or unavailable.
const FALLBACK_REGION: Region = { latitude: 40.4168, longitude: -3.7038, ...ZOOM };
// A fresh GPS fix can take minutes (or never come) indoors, so stop waiting after this.
const FIX_TIMEOUT_MS = 10_000;

const toRegion = ({ latitude, longitude }: Location.LocationObjectCoords): Region => ({ latitude, longitude, ...ZOOM });

async function currentPositionOrNull() {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
  return Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeout]);
}

/** The user's current zone; falls back to FALLBACK_REGION instead of throwing. */
export async function locateUser(): Promise<Region> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return FALLBACK_REGION;
    // The cached position is instant and good enough to center the map; only wait for a fix without one.
    const position = (await Location.getLastKnownPositionAsync()) ?? (await currentPositionOrNull());
    return position ? toRegion(position.coords) : FALLBACK_REGION;
  } catch {
    return FALLBACK_REGION;
  }
}

/** The user's current zone, or null while locating. */
export function useCurrentRegion() {
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    locateUser().then(setRegion);
  }, []);

  return [region, setRegion] as const;
}
