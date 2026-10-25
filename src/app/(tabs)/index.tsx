import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { EventAddress } from '@/components/event-address';
import { EventDeck } from '@/components/event-deck';
import { ThemedText } from '@/components/themed-text';
import { CardGradient } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { locateUser, useCurrentRegion, ZOOM } from '@/hooks/use-current-region';
import { useTheme } from '@/hooks/use-theme';
import { fetchEventsInRegion, type BEvent } from '@/lib/events';
import { auth } from '@/lib/firebase';
import { formatEventTime } from '@/lib/format';
import { listResponses, setResponse, type EventResponse } from '@/lib/responses';

const SNAP_POINTS = ['50%', '90%'];

export default function HomeScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useCurrentRegion();
  const [events, setEvents] = useState<BEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Map<string, EventResponse>>(new Map());
  // Frozen when opened so cards don't reshuffle as answers come in.
  const [deck, setDeck] = useState<BEvent[] | null>(null);
  const [locating, setLocating] = useState(false);
  const uid = auth.currentUser?.uid ?? null;

  // Refetch when the visible zone settles or the tab regains focus (e.g. after creating an event);
  // `cancelled` drops responses from stale regions.
  useFocusEffect(useCallback(() => {
    if (!region) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchEventsInRegion(region, uid), uid ? listResponses(uid) : new Map<string, EventResponse>()])
      .then(([list, answered]) => {
        if (cancelled) return;
        setEvents(list);
        setResponses(answered);
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

  // Moving the map triggers onRegionChangeComplete, which refetches events for the new zone.
  const centerOnMe = async () => {
    setLocating(true);
    mapRef.current?.animateToRegion(await locateUser());
    setLocating(false);
  };

  // The tapped event first, then everything here the user hasn't answered yet.
  const openDeck = (e: BEvent) => {
    focus(e);
    setDeck([e, ...events.filter((o) => o.id !== e.id && !responses.has(o.id))]);
  };

  const respond = (e: BEvent, response: EventResponse) => {
    if (!uid) return;
    setResponses((r) => new Map(r).set(e.id, response));
    setResponse(uid, e.id, response).catch((err: Error) => setError(err.message));
  };

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
            onCalloutPress={() => openDeck(e)}
          />
        ))}
      </MapView>

      <Pressable
        onPress={centerOnMe}
        disabled={locating}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
        style={({ pressed }) => [styles.locate, { backgroundColor: theme.background }, pressed && styles.pressed]}>
        {locating ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={[styles.locateRing, { borderColor: theme.primary }]}>
            <View style={[styles.locateDot, { backgroundColor: theme.primary }]} />
          </View>
        )}
      </Pressable>

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
              onPress={() => openDeck(item)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <CardGradient />
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatEventTime(item.startsAt.toDate())}
                {item.visibility === 'private' ? ' · Private' : ''}
              </ThemedText>
              <EventAddress event={item} />
              {responses.get(item.id) === 'interested' && (
                <ThemedText type="smallBold" themeColor="accent">♥ Interested</ThemedText>
              )}
            </Pressable>
          )}
        />
      </BottomSheet>

      {deck && uid && <EventDeck events={deck} uid={uid} onRespond={respond} onClose={() => setDeck(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Map owns the top half; the sheet's first snap point (50%) owns the bottom half.
  map: { height: '50%' },
  // Bottom-right of the map, just above where the sheet starts at its first snap point.
  locate: {
    position: 'absolute',
    top: '50%',
    right: Spacing.three,
    marginTop: -(48 + Spacing.five),
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  locateRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  locateDot: { width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  error: { color: '#D93025', paddingHorizontal: Spacing.three },
  list: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: BottomTabInset + Spacing.three },
  card: { padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.one, overflow: 'hidden' },
});
