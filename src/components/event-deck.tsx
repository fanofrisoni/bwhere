import { Image } from 'expo-image';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/themed-input';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BEvent } from '@/lib/events';
import { displayNameOf, type EventResponse } from '@/lib/responses';

const SWIPE_VELOCITY = 800;
const MAX_ROTATION = 12; // degrees at a full screen-width drag

type SwipeHandle = { swipe: (response: EventResponse) => void };

type Props = {
  events: BEvent[]; // deck order; the tapped event first
  uid: string;
  onRespond: (event: BEvent, response: EventResponse) => void;
  onClose: () => void;
};

/** Full-screen card stack: swipe right = interested, left = not interested. */
export function EventDeck({ events, uid, onRespond, onClose }: Props) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const topCard = useRef<SwipeHandle>(null);
  const current = events[index];
  const next = events[index + 1];

  const handleSwiped = (response: EventResponse) => {
    onRespond(current, response);
    setIndex((i) => i + 1);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {/* Gestures inside a Modal need their own root view on Android. */}
      <GestureHandlerRootView style={[styles.backdrop, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <ThemedText type="small" themeColor="textSecondary">
              {current ? `${index + 1} of ${events.length}` : ''}
            </ThemedText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
              <ThemedText type="subtitle" themeColor="textSecondary">×</ThemedText>
            </Pressable>
          </View>

          <View style={styles.stack}>
            {current ? (
              <>
                {next && (
                  <View style={[StyleSheet.absoluteFill, styles.behind]} pointerEvents="none">
                    <EventCard event={next} uid={uid} />
                  </View>
                )}
                {/* key remounts the card so each one starts centered with fresh animation state. */}
                <SwipeCard key={current.id} ref={topCard} onSwiped={handleSwiped}>
                  <EventCard event={current} uid={uid} />
                </SwipeCard>
              </>
            ) : (
              <View style={styles.done}>
                <ThemedText type="subtitle">All caught up</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  You've seen every event in this zone. Move the map to find more.
                </ThemedText>
                <Button title="Back to map" onPress={onClose} />
              </View>
            )}
          </View>

          {current && (
            <View style={styles.actions}>
              <RoundButton label="Not interested" glyph="✕" color={theme.textSecondary} onPress={() => topCard.current?.swipe('not_interested')} />
              <RoundButton label="Interested" glyph="♥" color={theme.accent} onPress={() => topCard.current?.swipe('interested')} />
            </View>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function SwipeCard({ children, onSwiped, ref }: { children: React.ReactNode; onSwiped: (r: EventResponse) => void; ref: Ref<SwipeHandle> }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const gone = useSharedValue(false); // ignores a second swipe (e.g. double-tapped button) while flying out

  const flyOut = (response: EventResponse) => {
    'worklet';
    if (gone.value) return;
    gone.value = true;
    const direction = response === 'interested' ? 1 : -1;
    x.value = withTiming(direction * width * 1.5, { duration: 250 }, (finished) => {
      if (finished) scheduleOnRN(onSwiped, response);
    });
  };

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
      y.value = e.translationY * 0.3;
    },
    onDeactivate: (e) => {
      'worklet';
      const flung = Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if (Math.abs(e.translationX) > width * 0.3 || flung) {
        flyOut(e.translationX > 0 ? 'interested' : 'not_interested');
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, width], [-MAX_ROTATION, MAX_ROTATION])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, width * 0.25], [0, 1], 'clamp') }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-width * 0.25, 0], [1, 0], 'clamp') }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        {children}
        <Animated.View style={[styles.stamp, styles.stampLike, likeStyle]} pointerEvents="none">
          <ThemedText type="smallBold" style={{ color: Palette.magenta[500] }}>INTERESTED</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampNope, nopeStyle]} pointerEvents="none">
          <ThemedText type="smallBold" style={{ color: Palette.indigo[500] }}>NOT FOR ME</ThemedText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function EventCard({ event, uid }: { event: BEvent; uid: string }) {
  const theme = useTheme();
  const [inviter, setInviter] = useState<string | null>(null);
  const isPrivate = event.visibility === 'private';
  const isMine = event.creatorId === uid;

  useEffect(() => {
    if (isPrivate && !isMine) displayNameOf(event.creatorId).then(setInviter);
  }, [event.id]);

  const price = event.price
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: event.currency ?? 'EUR' }).format(event.price)
    : 'Free';
  const access = !isPrivate ? 'Public' : isMine ? 'Private · Your event' : `Private · Invited by ${inviter ?? '…'}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {event.imageUrl ? (
        <Image source={event.imageUrl} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: Palette.violet[700] }]}>
          <ThemedText style={styles.imageLetter}>b</ThemedText>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge text={price} background={event.price ? Palette.violet[100] : Palette.petal[100]} color={event.price ? Palette.violet[800] : Palette.petal[800]} />
          <Badge
            text={access}
            background={isPrivate ? Palette.magenta[100] : Palette.indigo[100]}
            color={isPrivate ? Palette.magenta[800] : Palette.indigo[800]}
          />
        </View>
        <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>{event.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {event.startsAt.toDate().toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
        {!!event.description && <ThemedText numberOfLines={5}>{event.description}</ThemedText>}
      </View>
    </View>
  );
}

function Badge({ text, background, color }: { text: string; background: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <ThemedText type="smallBold" style={{ color }}>{text}</ThemedText>
    </View>
  );
}

function RoundButton({ label, glyph, color, onPress }: { label: string; glyph: string; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText style={[styles.glyph, { color }]}>{glyph}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two },
  stack: { flex: 1 },
  behind: { transform: [{ scale: 0.95 }, { translateY: 12 }], opacity: 0.7 },
  card: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  image: { width: '100%', height: '50%' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageLetter: { color: '#ffffff', fontSize: 96, lineHeight: 104, fontWeight: 800 },
  body: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.sm },
  title: { lineHeight: 38 },
  stamp: { position: 'absolute', top: Spacing.five, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderWidth: 3, borderRadius: Radius.sm, backgroundColor: '#ffffffE6' },
  stampLike: { left: Spacing.four, borderColor: Palette.magenta[500], transform: [{ rotate: '-12deg' }] },
  stampNope: { right: Spacing.four, borderColor: Palette.indigo[500], transform: [{ rotate: '12deg' }] },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.five, paddingVertical: Spacing.four },
  round: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  glyph: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  center: { textAlign: 'center' },
});
