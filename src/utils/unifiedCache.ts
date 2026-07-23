// utils/unifiedCache.ts

const DB_NAME = "CaelumUnifiedCache_v1";
const STORE_NAME = "audio_blobs";

interface UnifiedRecord {
  trackId: string;
  blob: Blob;
  mimeType: string;
  cachedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "trackId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Checks if a track is already cached in IndexedDB
 */
export async function getCachedTrack(
  trackId: string,
): Promise<UnifiedRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Saves a downloaded audio blob to IndexedDB
 */
export async function saveCachedTrack(
  trackId: string,
  blob: Blob,
  mimeType: string,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      trackId,
      blob,
      mimeType,
      cachedAt: Date.now(),
    });
  } catch {
    // Fail silently on storage limits
  }
}

/**
 * Background cache warmer with a realistic 30s timeout (instead of 2s)
 */
export async function cacheTrackInBackground(
  trackId: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const cached = await getCachedTrack(trackId);
  if (cached?.blob) return cached.blob;

  try {
    const res = await fetch(`/api/stream?id=${encodeURIComponent(trackId)}`, {
      signal,
    });

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength < 10000) return null;

    const mimeType = res.headers.get("content-type") || "audio/mp4";
    const audioBlob = new Blob([arrayBuffer], { type: mimeType });

    await saveCachedTrack(trackId, audioBlob, mimeType);
    return audioBlob;
  } catch {
    return null;
  }
}
