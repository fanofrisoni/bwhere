import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { EventAddress } from '@/components/event-address';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCurrentRegion, ZOOM } from '@/hooks/use-current-region';
import { useTheme } from '@/hooks/use-theme';
import { fetchEventsInRegion, type BEvent } from '@/lib/events';
import { auth } from '@/lib/firebase';
import { formatEventTime } from '@/lib/format';

const SNAP_POINTS = ['50%', '90%'];

export default function HomeScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useCurrentRegion();
  const [events, setEvents] = useState<BEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch when the visible zone settles or the tab regains focus (e.g. after creating an event);
  // `cancelled` drops responses from stale regions.
  useFocusEffect(useCallback(() => {
    if (!region) return;
    let cancelled = false;
    setLoading(true);
    fetchEventsInRegion(region, auth.currentUser?.uid ?? null)
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [region]));

  const focus = (e: BEvent) =>
    mapRef.current?.animateToRegion({ latitude: e.location.latitude, longitude: e.location.longitude, ...ZOOM });

  if (!region) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        onRegionChangeComplete={setRegion}>
        {events.map((e) => (
          <Marker
            key={e.id}
            coordinate={{ latitude: e.location.latitude, longitude: e.location.longitude }}
            title={e.title}
            description={e.visibility === 'private' ? 'Private event' : undefined}
            pinColor={e.visibility === 'private' ? 'purple' : 'red'}
          />
        ))}
      </MapView>

      <BottomSheet
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={{ backgroundColor: theme.textSecondary }}>
        <View style={styles.header}>
          <ThemedText type="smallBold">Happening here</ThemedText>
          {loading && <ActivityIndicator size="small" />}
        </View>
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <BottomSheetFlatList
          data={events}
          keyExtractor={(e: BEvent) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? undefined : (
              <ThemedText type="small" themeColor="textSecondary">
                No events in this zone yet.
              </ThemedText>
            )
          }
          renderItem={({ item }: { item: BEvent }) => (
            <Pressable
              onPress={() => focus(item)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${item.title} on map`}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatEventTime(item.startsAt.toDate())}
                {item.visibility === 'private' ? ' · Private' : ''}
              </ThemedText>
              <EventAddress event={item} />
            </Pressable>
          )}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Map owns the top half; the sheet's first snap point (50%) owns the bottom half.
  map: { height: '50%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  error: { color: '#D93025', paddingHorizontal: Spacing.three },
  list: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
