import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { addDoc, collection, GeoPoint, serverTimestamp, Timestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import MapView, { Marker, type LatLng } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, ThemedInput } from '@/components/themed-input';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentRegion } from '@/hooks/use-current-region';
import { useTheme } from '@/hooks/use-theme';
import { auth, db } from '@/lib/firebase';
import { formatEventTime } from '@/lib/format';
import { listFriendships, type Friendship } from '@/lib/friends';
import { lookupAddress } from '@/lib/maps';

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);

export default function CreateEventScreen() {
  const theme = useTheme();
  const [region] = useCurrentRegion();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(inOneHour);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [friends, setFriends] = useState<Friendship[] | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = pin ?? (region && { latitude: region.latitude, longitude: region.longitude });

  // "Invite Friends" list loads only once the event is switched to private.
  useEffect(() => {
    if (!isPrivate || friends) return;
    listFriendships(auth.currentUser!.uid)
      .then((all) => setFriends(all.filter((f) => f.status === 'accepted')))
      .catch((e: Error) => setError(e.message));
  }, [isPrivate, friends]);

  const toggleInvite = (uid: string) =>
    setInvited((cur) => (cur.includes(uid) ? cur.filter((u) => u !== uid) : [...cur, uid]));

  // Android has no combined date+time picker: pick the date, then the time.
  const pickAndroid = () =>
    DateTimePickerAndroid.open({
      value: startsAt,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (ev, date) => {
        if (ev.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (ev2, time) => ev2.type === 'set' && time && setStartsAt(time),
        });
      },
    });

  const submit = async () => {
    const uid = auth.currentUser!.uid;
    if (!title.trim()) return setError('Give your event a title.');
    if (!location) return setError('Drop a pin on the map.');
    if (startsAt.getTime() < Date.now()) return setError('Pick a time in the future.');
    if (isPrivate && invited.length === 0) return setError('Invite at least one friend.');

    setSaving(true);
    setError(null);
    try {
      const address = await lookupAddress(location.latitude, location.longitude);
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        creatorId: uid,
        location: new GeoPoint(location.latitude, location.longitude),
        geohash: geohashForLocation([location.latitude, location.longitude]),
        ...(address && { address }),
        startsAt: Timestamp.fromDate(startsAt),
        visibility: isPrivate ? 'private' : 'public',
        invited_users: isPrivate ? [uid, ...invited] : [],
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDescription('');
      setStartsAt(inOneHour());
      setPin(null);
      setIsPrivate(false);
      setInvited([]);
      router.navigate('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">New event</ThemedText>

          <ThemedInput placeholder="Title" value={title} onChangeText={setTitle} maxLength={80} />
          <ThemedInput
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            style={styles.multiline}
          />

          <View style={styles.row}>
            <ThemedText type="smallBold">Starts</ThemedText>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={startsAt}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(_, d) => d && setStartsAt(d)}
              />
            ) : (
              <Pressable onPress={pickAndroid} accessibilityRole="button">
                <ThemedText type="small">{formatEventTime(startsAt)}</ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Tap the map or drag the pin to set the location.
          </ThemedText>
          <View style={[styles.mapBox, { backgroundColor: theme.backgroundElement }]}>
            {region && location ? (
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={region}
                showsUserLocation
                onPress={(e) => setPin(e.nativeEvent.coordinate)}>
                <Marker coordinate={location} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} />
              </MapView>
            ) : (
              <ActivityIndicator style={StyleSheet.absoluteFill} />
            )}
          </View>

          <View style={styles.row}>
            <View>
              <ThemedText type="smallBold">{isPrivate ? 'Private' : 'Public'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isPrivate ? 'Only invited friends can see it' : 'Visible to everyone in the zone'}
              </ThemedText>
            </View>
            <Switch value={isPrivate} onValueChange={setIsPrivate} accessibilityLabel="Private event" />
          </View>

          {isPrivate && (
            <View style={styles.friends}>
              <ThemedText type="smallBold">Invite friends</ThemedText>
              {friends === null ? (
                <ActivityIndicator />
              ) : friends.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No friends yet. Add some in Settings.
                </ThemedText>
              ) : (
                friends.map((f) => {
                  const on = invited.includes(f.otherUid);
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleInvite(f.otherUid)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={[styles.friend, { backgroundColor: on ? theme.backgroundSelected : theme.backgroundElement }]}>
                      <ThemedText type="small">{f.displayName}</ThemedText>
                      <ThemedText type="smallBold">{on ? '✓' : ''}</ThemedText>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          {error && (
            <ThemedText type="small" style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}
          <Button title="Create event" onPress={submit} loading={saving} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  form: { gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  mapBox: { height: 220, borderRadius: Spacing.three, overflow: 'hidden' },
  friends: { gap: Spacing.two },
  friend: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.three, borderRadius: Spacing.three },
  error: { color: '#D93025' },
});
