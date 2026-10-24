import * as Location from 'expo-location';
import { ActionSheetIOS, Linking, Platform } from 'react-native';

// Reverse-geocoded results are cached per coordinate so list re-renders don't refetch.
const cache = new Map<string, Promise<string | null>>();

/** Short street address for a point ("Av. Juárez 123, Chihuahua"), or null if unknown. */
export function lookupAddress(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      .then(([a]) => {
        if (!a) return null;
        const street = [a.street, a.streetNumber].filter(Boolean).join(' ') || a.name;
        return [street, a.city ?? a.subregion].filter(Boolean).join(', ') || null;
      })
      .catch(() => null);
    cache.set(key, hit);
  }
  return hit;
}

/** Asks which maps app to use, then opens it with directions to the point. */
export async function openInMaps(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  if (Platform.OS === 'android') {
    // geo: lets Android show its own app chooser (Google Maps, Waze, ...).
    return Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${q})`);
  }

  const apps = [
    { name: 'Apple Maps', url: `maps://?daddr=${lat},${lng}&q=${q}` },
    { name: 'Google Maps', url: `comgooglemaps://?daddr=${lat},${lng}`, scheme: 'comgooglemaps://' },
    { name: 'Waze', url: `waze://?ll=${lat},${lng}&navigate=yes`, scheme: 'waze://' },
  ];
  // canOpenURL only answers for schemes listed under LSApplicationQueriesSchemes in app.json.
  const installed = (
    await Promise.all(apps.map(async (a) => (!a.scheme || (await Linking.canOpenURL(a.scheme)) ? a : null)))
  ).filter((a) => a !== null);

  if (installed.length === 1) return Linking.openURL(installed[0].url);
  ActionSheetIOS.showActionSheetWithOptions(
    { title: label, options: [...installed.map((a) => a.name), 'Cancel'], cancelButtonIndex: installed.length },
    (i) => i < installed.length && Linking.openURL(installed[i].url),
  );
}
