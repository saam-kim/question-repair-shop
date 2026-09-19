import { getDoc, getDocs, collection } from 'firebase/firestore';
import { sessionDocRef, getDb } from '../../src/firebase/db';
export async function snapshot(sid: string) {
  const s = await getDoc(sessionDocRef(sid));
  const t = await getDocs(collection(getDb(), 'qrsSessions', sid, 'teams'));
  return { session: s.data(), teams: Object.fromEntries(t.docs.map((d) => [d.id, d.data()])) };
}
