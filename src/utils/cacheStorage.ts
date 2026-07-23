// src/utils/cacheStorage.ts

const DB_NAME = "CaelumStreamCache";
const STORE_NAME = "audio_blobs";

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

export async function getCachedTrackBlob(
  trackId: string,
): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Fixes Install.tsx missing export error.
 * Hand-off stream URL immediately without blocking the audio player.
 */
export async function getOrFetchAudioUrl(
  trackId: string,
  onProgress?: (status: string) => void,
): Promise<string> {
  const cachedBlob = await getCachedTrackBlob(trackId);

  if (cachedBlob && cachedBlob.size > 50000) {
    onProgress?.("PLAYING FROM CACHE");
    return URL.createObjectURL(cachedBlob);
  }

  onProgress?.("STREAMING DIRECTLY...");
  return `/api/stream?id=${encodeURIComponent(trackId)}`;
}

// Alias for backwards compatibility if referenced elsewhere
export const getStreamUrl = getOrFetchAudioUrl;
