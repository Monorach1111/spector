/**
 * Scan history: Firestore first (anonymous user, collection `scans`),
 * localStorage fallback when Firestore is unavailable / offline / unconfigured.
 * Firestore rules (see README) should allow read/write only for the
 * signed-in anonymous user under their own uid.
 */
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirebase } from './firebase'
import type { HistoryItem, ScanResult } from '../types'

const LS_KEY = 'spector-history-v1'

function loadLocal(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as HistoryItem[]
  } catch {
    return []
  }
}

function saveLocal(items: HistoryItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 50)))
  } catch {
    /* storage full / unavailable — history is best-effort */
  }
}

export async function saveScan(result: ScanResult): Promise<HistoryItem> {
  const item: HistoryItem = { ...result, id: `local-${result.createdAt}` }
  const fb = getFirebase()
  if (fb?.auth.currentUser) {
    try {
      const ref = await addDoc(collection(fb.db, 'scans'), {
        ...result,
        uid: fb.auth.currentUser.uid,
        createdAt: serverTimestamp(),
      })
      item.id = ref.id
    } catch (err) {
      console.warn('[Spector] Firestore save failed, keeping local only:', err)
    }
  }
  const items = [item, ...loadLocal()].slice(0, 50)
  saveLocal(items)
  return item
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const local = loadLocal()
  const fb = getFirebase()
  if (!fb?.auth.currentUser) return local
  try {
    const q = query(collection(fb.db, 'scans'), orderBy('createdAt', 'desc'), limit(20))
    const snap = await getDocs(q)
    const mine = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<ScanResult, 'createdAt'>), createdAt: Date.now() }) as HistoryItem)
      .filter((i) => i.engine)
    return mine.length ? mine : local
  } catch (err) {
    console.warn('[Spector] Firestore load failed, using local history:', err)
    return local
  }
}

export function clearLocalHistory() {
  saveLocal([])
}
