import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { BEvent } from '@/lib/events';
import { lookupAddress, openInMaps } from '@/lib/maps';

/** The event's address; tapping it offers to open a maps app with directions. */
export function EventAddress({ event }: { event: BEvent }) {
  const { latitude, longitude } = event.location;
  const [looked, setLooked] = useState<string | null>(null);

  // Older events were saved without an address: look it up from the pin.
  useEffect(() => {
    if (event.address) return;
    let cancelled = false;
    lookupAddress(latitude, longitude).then((a) => !cancelled && setLooked(a));
    return () => {
      cancelled = true;
    };
  }, [event.address, latitude, longitude]);

  const address = event.address ?? looked;
  return (
    <Pressable
      onPress={() => openInMaps(latitude, longitude, address ?? event.title)}
      accessibilityRole="link"
      accessibilityLabel={`Get directions to ${event.title}`}
      hitSlop={6}>
      <ThemedText type="small" style={{ color: '#3c87f7' }} numberOfLines={1}>
        {address ?? 'Get directions'}
      </ThemedText>
    </Pressable>
  );
}
