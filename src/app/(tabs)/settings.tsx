import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, ThemedInput } from '@/components/themed-input';
<<<<<<< HEAD
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
=======
import { CardGradient, ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
>>>>>>> 938030ce76af7488d5631a2b159fce0342938d0b
import { useTheme } from '@/hooks/use-theme';
import { seedSampleEvents } from '@/lib/dev-seed';
import { auth, db } from '@/lib/firebase';
import { acceptFriendRequest, listFriendships, sendFriendRequest, type Friendship } from '@/lib/friends';

type Notifications = { eventInvites: boolean; nearbyEvents: boolean };

export default function SettingsScreen() {
  const theme = useTheme();
  const user = auth.currentUser!;
  const userRef = doc(db, 'users', user.uid);

  const [name, setName] = useState(user.displayName ?? '');
  const [notifications, setNotifications] = useState<Notifications>({ eventInvites: true, nearbyEvents: true });
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // which action is running
  const [message, setMessage] = useState<string | null>(null);

  const reloadFriends = () => listFriendships(user.uid).then(setFriendships);

  useEffect(() => {
    getDoc(userRef).then((s) => s.data()?.notifications && setNotifications(s.data()!.notifications));
    reloadFriends().catch((e: Error) => setMessage(e.message));
  }, []);

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      if (success) setMessage(success);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(null);
    }
  };

  const saveName = () =>
    run(
      'name',
      async () => {
        if (!name.trim()) throw new Error('Name cannot be empty.');
        await updateProfile(user, { displayName: name.trim() });
        await updateDoc(userRef, { displayName: name.trim() });
      },
      'Profile saved.',
    );

  const toggle = (key: keyof Notifications) => (value: boolean) => {
    setNotifications((n) => ({ ...n, [key]: value }));
    // Roll back the switch if the write fails so the UI never lies about the stored setting.
    updateDoc(userRef, { [`notifications.${key}`]: value }).catch((e: Error) => {
      setNotifications((n) => ({ ...n, [key]: !value }));
      setMessage(e.message);
    });
  };

  const addFriend = () =>
    run(
      'add',
      async () => {
        await sendFriendRequest(user.uid, friendEmail);
        setFriendEmail('');
        await reloadFriends();
      },
      'Friend request sent.',
    );

  const incoming = friendships.filter((f) => f.incoming);
  const friends = friendships.filter((f) => f.status === 'accepted');
  const card = [styles.card, { backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView gradient style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Settings</ThemedText>
          {message && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {message}
            </ThemedText>
          )}

          <View style={card}>
            <CardGradient />
            <ThemedText type="smallBold">Profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{user.email}</ThemedText>
            <ThemedInput placeholder="Display name" value={name} onChangeText={setName} style={{ backgroundColor: theme.background }} />
            <Button title="Save profile" onPress={saveName} loading={busy === 'name'} />
          </View>

          <View style={card}>
            <CardGradient />
            <ThemedText type="smallBold">Notifications</ThemedText>
            <View style={styles.row}>
              <ThemedText type="small">Event invites</ThemedText>
              <Switch value={notifications.eventInvites} onValueChange={toggle('eventInvites')} accessibilityLabel="Event invite notifications" />
            </View>
            <View style={styles.row}>
              <ThemedText type="small">New events nearby</ThemedText>
              <Switch value={notifications.nearbyEvents} onValueChange={toggle('nearbyEvents')} accessibilityLabel="Nearby event notifications" />
            </View>
          </View>

          <View style={card}>
            <CardGradient />
            <ThemedText type="smallBold">Friends</ThemedText>
            <ThemedInput
              placeholder="Friend's email"
              value={friendEmail}
              onChangeText={setFriendEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ backgroundColor: theme.background }}
            />
            <Button title="Send request" onPress={addFriend} loading={busy === 'add'} disabled={!friendEmail.trim()} />

            {incoming.map((f) => (
              <View key={f.id} style={styles.row}>
                <ThemedText type="small">{f.displayName} wants to be friends</ThemedText>
                <Button
                  variant="secondary"
                  title="Accept"
                  loading={busy === f.id}
                  onPress={() => run(f.id, async () => { await acceptFriendRequest(f.id); await reloadFriends(); })}
                />
              </View>
            ))}
            {friends.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">No friends yet.</ThemedText>
            ) : (
              friends.map((f) => <ThemedText key={f.id} type="small">{f.displayName}</ThemedText>)
            )}
          </View>

          <Button variant="secondary" title="Log out" onPress={() => run('logout', () => signOut(auth))} loading={busy === 'logout'} />

          {__DEV__ && (
            <View style={card}>
              <ThemedText type="smallBold">Developer</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Creates 10 events within 2 km of you over the next few weeks. 3 are private and only visible to you.
              </ThemedText>
              <Button
                variant="secondary"
                title="Add 10 sample events nearby"
                loading={busy === 'seed'}
                onPress={() => run('seed', () => seedSampleEvents(user.uid), 'Added 10 sample events. Open the Home tab to see them.')}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: { gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
<<<<<<< HEAD
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md },
=======
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three, overflow: 'hidden' },
>>>>>>> 938030ce76af7488d5631a2b159fce0342938d0b
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
});
