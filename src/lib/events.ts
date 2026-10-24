import { distanceBetween, geohashQueryBounds } from 'geofire-common';
import {
  collection,
  endAt,
  getDocs,
  orderBy,
  query,
  startAt,
  where,
  type GeoPoint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import type { Region } from 'react-native-maps';

import { db } from '@/lib/firebase';

// Firestore document shape for events/{eventId}.
export type BEvent = {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  location: GeoPoint;
  geohash: string; // geohashForLocation([lat, lng]) — written alongside location on create
  startsAt: Timestamp;
  visibility: 'public' | 'private';
  invited_users: string[]; // private: invitees + creator; public: []
  imageUrl?: string;
  price?: number; // missing or 0 = free
  currency?: string; // ISO 4217, e.g. 'EUR'
  createdAt: Timestamp;
};

const toEvent = (d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as BEvent;

export function inRegion(r: Region, lat: number, lng: number) {
  return (
    Math.abs(lat - r.latitude) <= r.latitudeDelta / 2 &&
    Math.abs(lng - r.longitude) <= r.longitudeDelta / 2
  );
}

// Radius (m) of the circle that covers the visible map rectangle: center → corner.
export function regionRadiusM(r: Region) {
  const corner: [number, number] = [r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2];
  return distanceBetween([r.latitude, r.longitude], corner) * 1000;
}

/**
 * Events visible to `uid` inside the map's bounding box.
 * - Public: geohash range queries (Firestore has no native bbox query), then trimmed to the box.
 * - Private: only events whose invited_users contains uid; the query shape matches firestore.rules.
 */
export async function fetchEventsInRegion(region: Region, uid: string | null): Promise<BEvent[]> {
  const events = collection(db, 'events');
  const bounds = geohashQueryBounds([region.latitude, region.longitude], regionRadiusM(region));

  const publicQueries = bounds.map(([start, end]) =>
    getDocs(query(events, where('visibility', '==', 'public'), orderBy('geohash'), startAt(start), endAt(end))),
  );
  // shortcut: loads all of the user's private invites and filters by box client-side; add a geohash range here if invites grow into the hundreds.
  const privateQuery = uid
    ? getDocs(query(events, where('invited_users', 'array-contains', uid)))
    : Promise.resolve(null);

  const [privateSnap, ...publicSnaps] = await Promise.all([privateQuery, ...publicQueries]);

  const byId = new Map<string, BEvent>();
  for (const snap of [...publicSnaps, privateSnap]) {
    snap?.docs.forEach((d) => {
      const e = toEvent(d);
      if (inRegion(region, e.location.latitude, e.location.longitude)) byId.set(e.id, e);
    });
  }
  return [...byId.values()].sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
}
