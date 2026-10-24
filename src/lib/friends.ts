import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type Friendship = {
  id: string;
  otherUid: string;
  displayName: string;
  status: 'pending' | 'accepted';
  incoming: boolean; // pending request someone else sent to me
};

// One doc per pair, whoever asks first.
export const friendshipId = (a: string, b: string) => [a, b].sort().join('_');

export async function listFriendships(uid: string): Promise<Friendship[]> {
  const snap = await getDocs(query(collection(db, 'friendships'), where('users', 'array-contains', uid)));
  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      const otherUid = (data.users as string[]).find((u) => u !== uid)!;
      const other = await getDoc(doc(db, 'users', otherUid));
      return {
        id: d.id,
        otherUid,
        displayName: other.data()?.displayName ?? 'Unknown',
        status: data.status,
        incoming: data.status === 'pending' && data.requestedBy !== uid,
      };
    }),
  );
}

export async function sendFriendRequest(uid: string, email: string) {
  const found = await getDocs(
    query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()), limit(1)),
  );
  const other = found.docs[0];
  if (!other) throw new Error('No user with that email.');
  if (other.id === uid) throw new Error("That's you.");

  const ref = doc(db, 'friendships', friendshipId(uid, other.id));
  if ((await getDoc(ref)).exists()) throw new Error('Already friends or request pending.');
  await setDoc(ref, {
    users: [uid, other.id].sort(),
    status: 'pending',
    requestedBy: uid,
    createdAt: serverTimestamp(),
  });
}

export const acceptFriendRequest = (id: string) => updateDoc(doc(db, 'friendships', id), { status: 'accepted' });
