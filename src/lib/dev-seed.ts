import { collection, doc, GeoPoint, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';

import { locateUser } from '@/hooks/use-current-region';
import { db } from '@/lib/firebase';

// Dev only: sample events for previewing the map and list. Offsets are metres from the user (north, east),
// all within ~2 km so they land inside the default map zoom.
const SAMPLES = [
  { title: 'Sunset rooftop drinks', description: 'Chill music and city views. Bring a friend.', north: 350, east: 420, price: 12, inDays: 1, hour: 19 },
  { title: 'Morning run club', description: '5 km easy pace, all levels welcome.', north: -600, east: 150, price: 0, inDays: 2, hour: 8 },
  { title: 'Street food market', description: 'Twenty stalls, from tacos to bao.', north: 900, east: -700, price: 0, inDays: 3, hour: 12 },
  { title: 'Board games night', description: 'Catan, Codenames and more. Games provided.', north: -250, east: -500, price: 0, inDays: 5, hour: 20, isPrivate: true },
  { title: 'Open-air cinema', description: 'Classic movie under the stars. Blankets recommended.', north: 1400, east: 600, price: 8, inDays: 7, hour: 21 },
  { title: 'Vinyl swap meet', description: 'Bring records to trade, or just dig through crates.', north: -1100, east: 900, price: 0, inDays: 9, hour: 11 },
  { title: 'Birthday picnic', description: 'Cake at 5, frisbee after.', north: 200, east: 1300, price: 0, inDays: 12, hour: 17, isPrivate: true },
  { title: 'Live jazz jam', description: 'House band plus open stage for anyone who plays.', north: -1500, east: -300, price: 15, inDays: 14, hour: 22 },
  { title: 'Photography walk', description: 'Golden-hour walk through the old town.', north: 650, east: -1600, price: 0, inDays: 18, hour: 18 },
  { title: 'Climbing session', description: 'Bouldering gym, beginners get a quick intro.', north: -800, east: -1200, price: 18, inDays: 25, hour: 16, isPrivate: true },
];

const METERS_PER_DEGREE = 111_320;

/** Writes the sample events around the user's current location, created by (and private ones visible to) `uid`. */
export async function seedSampleEvents(uid: string) {
  const { latitude, longitude } = await locateUser();
  const batch = writeBatch(db);

  for (const s of SAMPLES) {
    const lat = latitude + s.north / METERS_PER_DEGREE;
    const lng = longitude + s.east / (METERS_PER_DEGREE * Math.cos((latitude * Math.PI) / 180));
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + s.inDays);
    startsAt.setHours(s.hour, 0, 0, 0);

    batch.set(doc(collection(db, 'events')), {
      title: s.title,
      description: s.description,
      creatorId: uid,
      location: new GeoPoint(lat, lng),
      geohash: geohashForLocation([lat, lng]),
      startsAt: Timestamp.fromDate(startsAt),
      visibility: s.isPrivate ? 'private' : 'public',
      invited_users: s.isPrivate ? [uid] : [],
      // picsum.photos gives a stable random photo per seed, good enough for previewing cards.
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(s.title)}/800/600`,
      price: s.price,
      currency: 'EUR',
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return SAMPLES.length;
}
