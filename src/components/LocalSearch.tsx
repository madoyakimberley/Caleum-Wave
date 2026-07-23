"use client";

import { useState, useEffect } from "react";
import { usePlayer, TrackProfile } from "@/context/PlayerContext";

export default function LocalSearch({ searchQuery }: { searchQuery: string }) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [localTracks, setLocalTracks] = useState<TrackProfile[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTracks: TrackProfile[] = JSON.parse(
        localStorage.getItem("caelum_local_db") || "[]",
      );
      setLocalTracks(savedTracks);
    }
  }, []);

  const filteredTracks = localTracks.filter((track) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      track.title?.toLowerCase().includes(q) ||
      track.artist?.toLowerCase().includes(q) ||
      track.albumName?.toLowerCase().includes(q)
    );
  });

  const handlePlayTrack = (track: TrackProfile) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, filteredTracks);
    }
  };

  return (
    <div className="space-y-3">
      {filteredTracks.length === 0 ? (
        <div className="p-8 border-4 border-dashed border-outline-variant text-center bg-surface-container">
          <p className="font-label-lg text-on-surface-variant uppercase">
            {searchQuery
              ? "NO MATCHING LOCAL TRACKS"
              : "NO TRACKS IN LOCAL LIBRARY"}
          </p>
        </div>
      ) : (
        filteredTracks.map((track, idx) => {
          const isCurrent = currentTrack?.id === track.id;

          return (
            <div
              key={track.id || idx}
              onClick={() => handlePlayTrack(track)}
              className={`chunky-border p-3 flex items-center justify-between gap-3 cursor-pointer active-press transition-all ${
                isCurrent
                  ? "bg-primary-container/30 border-primary"
                  : "bg-surface-container-high hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Track Thumbnail */}
                <div className="w-12 h-12 border-2 border-outline bg-surface-container-lowest flex-shrink-0 overflow-hidden relative">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover pixelated"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined">
                        music_note
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-label-lg truncate uppercase font-bold ${
                      isCurrent ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="font-label-sm text-secondary truncate uppercase">
                    {track.artist || "UNKNOWN ARTIST"}
                    {track.albumName ? ` • ${track.albumName}` : ""}
                  </p>
                </div>
              </div>

              {/* Play / Pause Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayTrack(track);
                }}
                className={`w-10 h-10 border-2 flex items-center justify-center flex-shrink-0 active-press ${
                  isCurrent
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container text-on-surface hover:border-secondary"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isCurrent && isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
