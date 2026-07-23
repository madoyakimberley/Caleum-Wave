"use client";

import { useState, useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

interface OnlineTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  genre?: string;
}

interface TrackMeta extends OnlineTrack {
  playCount: number;
  lastPlayedAt: number;
}

interface OnlineStreamProps {
  initialQuery?: string;
}

// ==========================================
// LOCAL DEVICE VAULT & METADATA (512KB PRECACHE)
// ==========================================
const DB_NAME = "CaelumAudioVault_v15";
const STORE_BLOBS = "audio_blobs";
const STORE_META = "track_metadata";
const PRECACHE_LIMIT_BYTES = 512 * 1024; // 512KB for instant start

interface ChunkRecord {
  trackId: string;
  blob: Blob;
  totalBytes: number;
  isComplete: boolean;
  isPlayed?: boolean;
  mimeType: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "trackId" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        const metaStore = db.createObjectStore(STORE_META, { keyPath: "id" });
        metaStore.createIndex("artist", "artist", { unique: false });
        metaStore.createIndex("lastPlayedAt", "lastPlayedAt", {
          unique: false,
        });
        metaStore.createIndex("playCount", "playCount", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getChunkRecord(trackId: string): Promise<ChunkRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, "readonly");
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveChunkRecord(record: ChunkRecord): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    const store = tx.objectStore(STORE_BLOBS);
    store.put(record);
  } catch {}
}

// Cleans up unplayed audio chunks to reclaim device storage
async function cleanupUnplayedChunks(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    const store = tx.objectStore(STORE_BLOBS);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const record = cursor.value as ChunkRecord;
        if (!record.isPlayed) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch {}
}

// Records local play stats strictly on the user's device
async function recordLocalPlay(track: OnlineTrack): Promise<void> {
  try {
    const db = await openDB();
    // 1. Mark Audio Blob as Played (preserves it during storage cleanup)
    const blobTx = db.transaction(STORE_BLOBS, "readwrite");
    const blobStore = blobTx.objectStore(STORE_BLOBS);
    const blobReq = blobStore.get(track.id);
    blobReq.onsuccess = () => {
      if (blobReq.result) {
        blobStore.put({ ...blobReq.result, isPlayed: true });
      }
    };

    // 2. Increment metadata play counts
    const metaTx = db.transaction(STORE_META, "readwrite");
    const metaStore = metaTx.objectStore(STORE_META);
    const metaReq = metaStore.get(track.id);
    metaReq.onsuccess = () => {
      const existing = metaReq.result as TrackMeta | undefined;
      const updated: TrackMeta = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        genre: track.genre || "General",
        playCount: (existing?.playCount || 0) + 1,
        lastPlayedAt: Date.now(),
      };
      metaStore.put(updated);
    };
  } catch {}
}

async function getWeeklyRecapTracks(): Promise<TrackMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_META, "readonly");
      const store = tx.objectStore(STORE_META);
      const req = store.getAll();
      req.onsuccess = () => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const tracks = (req.result || []) as TrackMeta[];
        const filtered = tracks
          .filter((t) => t.lastPlayedAt >= oneWeekAgo)
          .sort((a, b) => b.playCount - a.playCount);
        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function getTopArtistsList(): Promise<
  { artist: string; plays: number; count: number }[]
> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_META, "readonly");
      const store = tx.objectStore(STORE_META);
      const req = store.getAll();
      req.onsuccess = () => {
        const tracks = (req.result || []) as TrackMeta[];
        const map: Record<string, { plays: number; count: number }> = {};

        tracks.forEach((t) => {
          if (!map[t.artist]) map[t.artist] = { plays: 0, count: 0 };
          map[t.artist].plays += t.playCount;
          map[t.artist].count += 1;
        });

        const sorted = Object.entries(map)
          .map(([artist, data]) => ({ artist, ...data }))
          .sort((a, b) => b.plays - a.plays);

        resolve(sorted);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ==========================================
// 512KB FAST INITIAL PRECACHING
// ==========================================
async function cacheTrackInitialChunk(
  trackId: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const existingRecord = await getChunkRecord(trackId);
  if (
    existingRecord &&
    (existingRecord.isComplete ||
      existingRecord.totalBytes >= PRECACHE_LIMIT_BYTES)
  ) {
    return true;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const res = await fetch(`/api/stream?id=${encodeURIComponent(trackId)}`, {
      headers: { Range: "bytes=0-" },
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!res.ok && res.status !== 206) return false;

    const mimeType = res.headers.get("content-type") || "audio/mp4";
    const reader = res.body?.getReader();
    if (!reader) return false;

    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    let isComplete = false;

    while (bytesRead < PRECACHE_LIMIT_BYTES) {
      if (combinedSignal.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        isComplete = true;
        break;
      }
      if (value) {
        chunks.push(value);
        bytesRead += value.byteLength;
      }
    }

    try {
      reader.cancel();
    } catch {}

    if (bytesRead === 0) return false;

    const initialBlob = new Blob(chunks as unknown as BlobPart[], {
      type: mimeType,
    });

    await saveChunkRecord({
      trackId,
      blob: initialBlob,
      totalBytes: bytesRead,
      isComplete,
      isPlayed: existingRecord?.isPlayed || false,
      mimeType,
    });

    return true;
  } catch {
    return false;
  }
}

// Background downloader for active audio playback
async function finishTrackDownloadInBackground(
  trackId: string,
  signal?: AbortSignal,
): Promise<void> {
  let record = await getChunkRecord(trackId);
  if (record?.isComplete) return;

  try {
    const headers: Record<string, string> = {};
    if (record) {
      headers.Range = `bytes=${record.totalBytes}-`;
    }

    const res = await fetch(`/api/stream?id=${encodeURIComponent(trackId)}`, {
      headers,
      signal,
    });

    if (!res.ok) return;

    const mimeType = res.headers.get("content-type") || "audio/mp4";
    const reader = res.body?.getReader();
    if (!reader) return;

    const remainingChunks: Uint8Array[] = [];
    let extraBytes = 0;

    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        remainingChunks.push(value);
        extraBytes += value.byteLength;
      }
    }

    let completeBlob: Blob;
    let finalTotalBytes: number;
    const finalMimeType = record?.mimeType || mimeType;

    if (res.status === 206 && record) {
      completeBlob = new Blob(
        [record.blob, ...remainingChunks] as unknown as BlobPart[],
        { type: finalMimeType },
      );
      finalTotalBytes = record.totalBytes + extraBytes;
    } else {
      completeBlob = new Blob(remainingChunks as unknown as BlobPart[], {
        type: finalMimeType,
      });
      finalTotalBytes = extraBytes;
    }

    await saveChunkRecord({
      trackId,
      blob: completeBlob,
      totalBytes: finalTotalBytes,
      isComplete: true,
      isPlayed: true, // User played this, save permanently in vault
      mimeType: finalMimeType,
    });
  } catch {}
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function OnlineStream({ initialQuery = "" }: OnlineStreamProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<
    "search" | "recap" | "discover" | "artists"
  >("search");

  // Stream States
  const [revealedTracks, setRevealedTracks] = useState<OnlineTrack[]>([]);
  const [pendingSkeletons, setPendingSkeletons] = useState(0);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCachingQueue, setIsCachingQueue] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Recommendations & Stats
  const [weeklyRecap, setWeeklyRecap] = useState<TrackMeta[]>([]);
  const [topArtists, setTopArtists] = useState<
    { artist: string; plays: number; count: number }[]
  >([]);
  const [recommendedTracks, setRecommendedTracks] = useState<OnlineTrack[]>([]);

  // Typewriter Roasting
  const [typedText, setTypedText] = useState("");
  const [loadMoreRoast, setLoadMoreRoast] = useState<string | null>(null);

  const activeBlobUrls = useRef<string[]>([]);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pipelineRunId = useRef(0);
  const seenTrackIdsRef = useRef<Set<string>>(new Set());

  const cacheAbortController = useRef<AbortController>(new AbortController());
  const priorityTrackRef = useRef<string | null>(null);

  // Initial load: Fetch local stats & clean unplayed cached audio
  useEffect(() => {
    cleanupUnplayedChunks();
    loadStatsAndRecap();
    return () => {
      cacheAbortController.current.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      activeBlobUrls.current.forEach((url) => {
        if (currentTrack?.url && !url.includes(currentTrack.url)) {
          URL.revokeObjectURL(url);
        }
      });
      activeBlobUrls.current = activeBlobUrls.current.filter(
        (url) => currentTrack?.url && url.includes(currentTrack.url),
      );

      if (typewriterTimeoutRef.current)
        clearTimeout(typewriterTimeoutRef.current);
    };
  }, [currentTrack]);

  const loadStatsAndRecap = async () => {
    const recap = await getWeeklyRecapTracks();
    const artists = await getTopArtistsList();
    setWeeklyRecap(recap);
    setTopArtists(artists);

    // Auto-generate discover recommendations based on top artist
    if (artists.length > 0) {
      const topArtist = artists[0].artist;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(topArtist)}&page=1`,
        );
        if (res.ok) {
          const data = await res.json();
          setRecommendedTracks(data.results || []);
        }
      } catch {}
    }
  };

  const startTypewriterAsync = (fullText: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typewriterTimeoutRef.current)
        clearTimeout(typewriterTimeoutRef.current);
      setTypedText("");
      let i = 0;

      const typeNextChar = () => {
        if (i < fullText.length) {
          setTypedText(fullText.substring(0, i + 1));
          i++;
          typewriterTimeoutRef.current = setTimeout(typeNextChar, 30);
        } else {
          resolve();
        }
      };
      typeNextChar();
    });
  };

  const fetchNextUnseenBatch = async (
    searchQuery: string,
    startPage: number,
    targetCount: number = 5,
  ): Promise<{ tracks: OnlineTrack[]; lastPage: number }> => {
    let page = startPage;
    let accumulatedUnseen: OnlineTrack[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (accumulatedUnseen.length < targetCount && attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&page=${page}`,
        );
        if (!res.ok) break;

        const data = await res.json();
        const results: OnlineTrack[] = data.results || [];
        if (results.length === 0) break;

        for (const track of results) {
          if (
            !seenTrackIdsRef.current.has(track.id) &&
            accumulatedUnseen.length < targetCount
          ) {
            seenTrackIdsRef.current.add(track.id);
            accumulatedUnseen.push(track);
          }
        }
        page++;
      } catch {
        break;
      }
    }
    return { tracks: accumulatedUnseen, lastPage: page };
  };

  const fetchRoastText = async (
    action: "initial" | "load_more",
  ): Promise<string> => {
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, action }),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.roast || "";
      }
    } catch {}
    return "";
  };

  const processAndRevealCachedTracks = async (
    tracks: OnlineTrack[],
    runId: number,
  ) => {
    setIsCachingQueue(true);

    for (const track of tracks) {
      if (runId !== pipelineRunId.current) break;

      while (
        priorityTrackRef.current &&
        priorityTrackRef.current !== track.id &&
        runId === pipelineRunId.current
      ) {
        await sleep(100);
      }

      // Pre-cache 512KB chunk for 2-sec fast buffer preview
      await cacheTrackInitialChunk(
        track.id,
        cacheAbortController.current.signal,
      );

      if (runId !== pipelineRunId.current) break;

      setRevealedTracks((prev) => {
        if (prev.some((t) => t.id === track.id)) return prev;
        return [...prev, track];
      });

      setPendingSkeletons((prev) => Math.max(0, prev - 1));
    }

    if (runId === pipelineRunId.current) {
      setIsCachingQueue(false);
      setPendingSkeletons(0);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setActiveTab("search");
    cleanupUnplayedChunks(); // Clear unplayed blobs from past searches

    const runId = ++pipelineRunId.current;

    setIsInputLocked(true);
    setIsLoadingMore(false);
    setRevealedTracks([]);
    setPendingSkeletons(5);
    setLoadMoreRoast(null);
    setTypedText("");
    setCurrentPage(1);
    seenTrackIdsRef.current.clear();

    cacheAbortController.current.abort();
    cacheAbortController.current = new AbortController();

    const roastPromise = fetchRoastText("initial");
    const searchPromise = fetchNextUnseenBatch(query, 1, 5);

    const [roastText, batch] = await Promise.all([roastPromise, searchPromise]);

    if (runId !== pipelineRunId.current) return;

    if (batch.tracks.length === 0) {
      setPendingSkeletons(0);
      setIsInputLocked(false);
      return;
    }

    setCurrentPage(batch.lastPage);

    const cachingTask = processAndRevealCachedTracks(batch.tracks, runId);

    if (roastText && runId === pipelineRunId.current) {
      await startTypewriterAsync(roastText);
    }

    await cachingTask;

    if (runId === pipelineRunId.current) {
      setIsInputLocked(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || isCachingQueue || !query.trim()) return;

    const runId = ++pipelineRunId.current;
    setIsLoadingMore(true);
    setLoadMoreRoast(null);

    const roastPromise = fetchRoastText("load_more");
    const searchPromise = fetchNextUnseenBatch(query, currentPage, 10);

    const [roastText, batch] = await Promise.all([roastPromise, searchPromise]);

    if (runId !== pipelineRunId.current || batch.tracks.length === 0) {
      setIsLoadingMore(false);
      return;
    }

    if (roastText) setLoadMoreRoast(roastText);
    setCurrentPage(batch.lastPage);

    setPendingSkeletons(batch.tracks.length);
    setIsLoadingMore(false);

    await processAndRevealCachedTracks(batch.tracks, runId);
  };

  // ==========================================
  // STREAM / PRIORITY PLAYBACK ENGINE
  // ==========================================
  const handleStreamTrack = async (track: OnlineTrack) => {
    if (Date.now() - ((window as any).lastPlayTime || 0) < 500) return;
    (window as any).lastPlayTime = Date.now();

    if (loadingTrackId) return;

    if (currentTrack?.id === track.id) {
      togglePlayPause();
      return;
    }

    setLoadingTrackId(track.id);
    priorityTrackRef.current = track.id;

    // Record local device stats
    await recordLocalPlay(track);
    loadStatsAndRecap();

    try {
      const record = await getChunkRecord(track.id);
      let audioUrl: string;

      if (record && record.isComplete) {
        audioUrl = URL.createObjectURL(record.blob);
        activeBlobUrls.current.push(audioUrl);
      } else {
        // Stream directly using 512KB pre-buffered connection
        audioUrl = `/api/stream?id=${encodeURIComponent(track.id)}`;

        // Download full track silently in the background & save to device bucket
        finishTrackDownloadInBackground(
          track.id,
          cacheAbortController.current.signal,
        ).catch(() => {});
      }

      await playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        url: audioUrl,
        isOnline: true,
      } as any);
    } catch (err: any) {
      console.error("Playback error:", err);
    } finally {
      setLoadingTrackId(null);
      priorityTrackRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      {/* NAVIGATION TABS */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container border-2 border-outline">
        {[
          { id: "search", label: "STREAM", icon: "search" },
          { id: "recap", label: "RECAP", icon: "history" },
          { id: "discover", label: "DISCOVER", icon: "explore" },
          { id: "artists", label: "ARTISTS", icon: "person" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-1 text-center font-label-lg text-xs uppercase flex items-center justify-center gap-1 transition-all ${
              activeTab === tab.id
                ? "bg-secondary text-on-secondary font-bold shadow-sm"
                : "text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {tab.icon}
            </span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: STREAM / SEARCH */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH ONLINE TRACKS..."
              className="flex-1 p-3 bg-surface-container-lowest border-4 border-outline text-on-surface font-label-lg uppercase focus:outline-none focus:border-secondary"
            />
            <button
              type="submit"
              disabled={isInputLocked || isLoadingMore}
              className="px-5 bg-secondary text-on-secondary font-label-lg uppercase chunky-border active-press"
            >
              {isInputLocked ? "..." : "SEARCH"}
            </button>
          </form>

          {typedText && (
            <div className="p-4 border-4 border-dashed border-secondary bg-secondary-container/20 text-center animate-in fade-in">
              <p className="font-mono text-sm text-on-surface font-bold min-h-[1.5rem]">
                {typedText}
                <span className="animate-pulse text-secondary">█</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            {revealedTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLoading = loadingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handleStreamTrack(track)}
                  className={`chunky-border p-3 flex items-center justify-between gap-3 cursor-pointer active-press transition-all animate-in fade-in slide-in-from-bottom-2 ${
                    isCurrent
                      ? "bg-secondary-container/30 border-secondary"
                      : "bg-surface-container-high hover:bg-surface-container-highest"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 object-cover border-2 border-secondary flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-label-lg truncate font-bold ${
                          isCurrent ? "text-secondary" : "text-on-surface"
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="font-label-sm text-on-surface-variant truncate uppercase">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStreamTrack(track);
                    }}
                    className={`w-10 h-10 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isCurrent
                        ? "border-secondary bg-secondary text-on-secondary"
                        : "border-outline bg-surface text-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isLoading ? (
                        <span className="animate-spin text-sm">sync</span>
                      ) : isCurrent && isPlaying ? (
                        "pause"
                      ) : (
                        "play_arrow"
                      )}
                    </span>
                  </button>
                </div>
              );
            })}

            {pendingSkeletons > 0 &&
              Array.from({ length: pendingSkeletons }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="chunky-border p-3 flex items-center justify-between gap-3 bg-surface-container animate-pulse"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-outline-variant/30 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-outline-variant/40 w-3/4" />
                      <div className="h-3 bg-outline-variant/20 w-1/2" />
                      <div className="text-[10px] text-secondary font-mono flex items-center gap-1">
                        <span className="animate-spin inline-block">⟳</span>
                        PRE-CACHING 512KB...
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-outline-variant/30 flex-shrink-0" />
                </div>
              ))}
          </div>

          {!isInputLocked && revealedTracks.length > 0 && (
            <div className="pt-4 space-y-3">
              {loadMoreRoast && (
                <div className="p-3 border-2 border-dashed border-secondary bg-secondary-container/10 text-center animate-in fade-in">
                  <p className="text-sm font-mono text-on-surface italic">
                    "{loadMoreRoast}"
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isCachingQueue || !!loadingTrackId}
                className="w-full py-3 bg-surface-container-high border-4 border-outline hover:border-secondary font-label-lg uppercase chunky-border active-press flex items-center justify-center gap-2 text-on-surface disabled:opacity-50"
              >
                {isCachingQueue ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">
                      sync
                    </span>
                    <span>PRE-CACHING BATCH...</span>
                  </>
                ) : (
                  <span>LOAD MORE 10 TRACKS</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WEEKLY RECAP */}
      {activeTab === "recap" && (
        <div className="space-y-3">
          <div className="p-3 bg-secondary-container/30 border-2 border-secondary">
            <h3 className="font-label-lg uppercase font-bold text-secondary">
              📅 WEEKLY RECAP PLAYLIST
            </h3>
            <p className="text-xs text-on-surface-variant uppercase">
              Top tracks played on this device in the last 7 days
            </p>
          </div>

          {weeklyRecap.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-outline text-on-surface-variant font-mono text-xs uppercase">
              NO LOCAL PLAYS THIS WEEK. START STREAMING TRACKS!
            </div>
          ) : (
            weeklyRecap.map((track, i) => (
              <div
                key={track.id}
                onClick={() => handleStreamTrack(track)}
                className="chunky-border p-3 flex items-center justify-between gap-3 bg-surface-container-high cursor-pointer hover:border-secondary"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono font-bold text-secondary text-sm">
                    #{i + 1}
                  </span>
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-10 h-10 object-cover border border-secondary flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-label-lg truncate font-bold text-on-surface">
                      {track.title}
                    </p>
                    <p className="font-label-sm text-on-surface-variant truncate uppercase">
                      {track.artist}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="px-2 py-1 bg-secondary/20 text-secondary border border-secondary font-mono text-[10px] font-bold">
                    {track.playCount} PLAYS
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: DISCOVER & RECOMMENDATIONS */}
      {activeTab === "discover" && (
        <div className="space-y-3">
          <div className="p-3 bg-secondary-container/30 border-2 border-secondary">
            <h3 className="font-label-lg uppercase font-bold text-secondary">
              🎧 RECOMMENDED FOR YOU
            </h3>
            <p className="text-xs text-on-surface-variant uppercase">
              {topArtists.length > 0
                ? `Based on your love for ${topArtists[0].artist}`
                : "Explore trending online recommendations"}
            </p>
          </div>

          {recommendedTracks.map((track) => (
            <div
              key={track.id}
              onClick={() => handleStreamTrack(track)}
              className="chunky-border p-3 flex items-center justify-between gap-3 bg-surface-container-high cursor-pointer hover:border-secondary"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 object-cover border border-secondary flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-label-lg truncate font-bold text-on-surface">
                    {track.title}
                  </p>
                  <p className="font-label-sm text-on-surface-variant truncate uppercase">
                    {track.artist}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-8 h-8 border border-outline flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-sm">
                  play_arrow
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: MOST PLAYED ARTISTS */}
      {activeTab === "artists" && (
        <div className="space-y-3">
          <div className="p-3 bg-secondary-container/30 border-2 border-secondary">
            <h3 className="font-label-lg uppercase font-bold text-secondary">
              🎤 MOST PLAYED ARTISTS
            </h3>
            <p className="text-xs text-on-surface-variant uppercase">
              Aggregated from your device's audio vault
            </p>
          </div>

          {topArtists.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-outline text-on-surface-variant font-mono text-xs uppercase">
              NO ARTIST STATS YET. PLAY SONGS TO BUILD YOUR PROFILE.
            </div>
          ) : (
            topArtists.map((artist, i) => (
              <div
                key={artist.artist}
                className="chunky-border p-3 flex items-center justify-between bg-surface-container-high"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-secondary text-sm">
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-label-lg font-bold text-on-surface uppercase">
                      {artist.artist}
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-mono">
                      {artist.count} UNIQUE TRACKS PLAYED
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-secondary font-bold">
                  {artist.plays} TOTAL PLAYS
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
