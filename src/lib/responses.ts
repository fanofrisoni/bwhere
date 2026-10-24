import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

// users/{uid}/responses/{eventId}: what the user swiped on an event in the deck.
export type EventResponse = 'interested' | 'not_interested';

export async function listResponses(uid: string) {
  const snap = await getDocs(collection(db, 'users', uid, 'responses'));
  return new Map(snap.docs.map((d) => [d.id, d.data().status as EventResponse]));
}

export function setResponse(uid: string, eventId: string, status: EventResponse) {
  return setDoc(doc(db, 'users', uid, 'responses', eventId), { status, at: serverTimestamp() });
}

// Creator names for "Invited by …"; cached for the session since names rarely change.
const names = new Map<string, Promise<string>>();

export function displayNameOf(uid: string) {
  if (!names.has(uid)) {
    names.set(uid, getDoc(doc(db, 'users', uid)).then((s) => s.data()?.displayName ?? 'Someone', () => 'Someone'));
  }
  return names.get(uid)!;
}
