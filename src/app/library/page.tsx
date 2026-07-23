"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
import StorageMeter from "@/components/StorageMeter";
import OnlineStream from "@/components/OnlineStream";
import { usePlayer, TrackProfile } from "@/context/PlayerContext";

interface AlbumItem {
  id: string;
  name: string;
  theme?: string;
  image?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  const [activeTab, setActiveTab] = useState<
    "all" | "tracks" | "albums" | "stream"
  >("all");
  const [tracks, setTracks] = useState<TrackProfile[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTracks: TrackProfile[] = JSON.parse(
        localStorage.getItem("caelum_local_db") || "[]",
      );
      const savedAlbums: AlbumItem[] = JSON.parse(
        localStorage.getItem("caelum_albums_db") || "[]",
      );

      setTracks(savedTracks);
      setAlbums(savedAlbums);
    }
  }, []);

  const handlePlayTrack = (track: TrackProfile) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track, tracks);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-32 overflow-x-hidden flex flex-col">
      <header className="sticky top-0 z-40 bg-surface border-b-4 border-outline-variant px-margin-mobile py-4 flex justify-between items-center retro-shadow">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-secondary text-on-secondary chunky-border flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">
              folder_open
            </span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tighter uppercase leading-none">
              LIBRARY MATRIX
            </h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              {activeTab === "stream" ? "ONLINE HUB" : "LOCAL STORAGE"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/search")}
          className="px-3 py-1.5 border-2 border-primary bg-primary-container/20 text-primary font-label-lg text-label-lg uppercase flex items-center gap-1.5 active-press"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>INSTALL</span>
        </button>
      </header>

      <main className="px-margin-mobile pt-4 space-y-6 flex-grow">
        <StorageMeter />

        {/* 4-Tab Control Bar */}
        <div className="grid grid-cols-4 gap-1.5 bg-surface-container-low p-1 border-2 border-outline">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`py-2 font-label-lg text-xs uppercase transition-colors truncate ${
              activeTab === "all"
                ? "bg-primary text-on-primary font-bold"
                : "text-on-surface-variant"
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tracks")}
            className={`py-2 font-label-lg text-xs uppercase transition-colors truncate ${
              activeTab === "tracks"
                ? "bg-primary text-on-primary font-bold"
                : "text-on-surface-variant"
            }`}
          >
            SONGS ({tracks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("albums")}
            className={`py-2 font-label-lg text-xs uppercase transition-colors truncate ${
              activeTab === "albums"
                ? "bg-primary text-on-primary font-bold"
                : "text-on-surface-variant"
            }`}
          >
            ALBUMS ({albums.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stream")}
            className={`py-2 font-label-lg text-xs uppercase transition-colors flex items-center justify-center gap-1 truncate ${
              activeTab === "stream"
                ? "bg-secondary text-on-secondary font-bold"
                : "text-secondary"
            }`}
          >
            <span className="material-symbols-outlined text-sm">wifi</span>
            STREAM
          </button>
        </div>

        {/* ONLINE STREAMING TAB */}
        {activeTab === "stream" && <OnlineStream />}

        {/* ALBUMS LIST */}
        {(activeTab === "all" || activeTab === "albums") && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-outline-variant pb-2">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined">album</span>
                ALBUMS ({albums.length})
              </h2>
            </div>

            {albums.length === 0 ? (
              <div className="p-6 border-4 border-dashed border-outline-variant text-center bg-surface-container">
                <p className="font-label-lg text-on-surface-variant uppercase mb-2">
                  NO ALBUMS CREATED
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {albums.map((alb) => {
                  const matchingCount = tracks.filter(
                    (t) => t.albumId === alb.id || t.albumName === alb.name,
                  ).length;

                  return (
                    <div
                      key={alb.id}
                      onClick={() => router.push(`/album/${alb.id}`)}
                      className="chunky-border bg-surface-container p-2 retro-shadow active-press cursor-pointer relative overflow-hidden group"
                    >
                      <div
                        className="h-2 w-full mb-2 border-b-2 border-outline-variant"
                        style={{
                          background: alb.theme || "var(--primary-container)",
                        }}
                      />
                      <div className="aspect-square chunky-border mb-2 overflow-hidden bg-surface-container-lowest flex items-center justify-center relative">
                        {alb.image ? (
                          <img
                            className="w-full h-full object-cover pixelated"
                            src={alb.image}
                            alt={alb.name}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-4xl text-outline">
                            album
                          </span>
                        )}
                      </div>
                      <p className="font-label-lg text-label-lg text-on-surface truncate uppercase font-bold">
                        {alb.name}
                      </p>
                      <p className="font-label-sm text-label-sm-mobile text-on-surface-variant uppercase">
                        {matchingCount}{" "}
                        {matchingCount === 1 ? "TRACK" : "TRACKS"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SONGS LIST */}
        {(activeTab === "all" || activeTab === "tracks") && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-outline-variant pb-2">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined">music_note</span>
                ALL SONGS ({tracks.length})
              </h2>
            </div>

            {tracks.length === 0 ? (
              <div className="p-6 border-4 border-dashed border-outline-variant text-center bg-surface-container">
                <p className="font-label-lg text-on-surface-variant uppercase mb-2">
                  NO INSTALLED TRACKS
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className={`chunky-border p-3 flex items-center justify-between gap-3 cursor-pointer active-press transition-all ${
                        isCurrent
                          ? "bg-primary-container/30 border-primary"
                          : "bg-surface-container-high hover:bg-surface-container-highest"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 flex items-center justify-center font-mono font-bold text-xs text-secondary flex-shrink-0">
                          {isCurrent ? (
                            <span className="material-symbols-outlined text-primary text-xl animate-pulse">
                              {isPlaying ? "equalizer" : "pause"}
                            </span>
                          ) : (
                            <span>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </span>
                          )}
                        </div>

                        <div className="w-10 h-10 border border-outline bg-surface-container-lowest flex-shrink-0 overflow-hidden relative">
                          {track.thumbnail ? (
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover pixelated"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                              <span className="material-symbols-outlined text-lg">
                                music_note
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-label-lg text-label-lg truncate uppercase font-bold ${
                              isCurrent ? "text-primary" : "text-on-surface"
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="font-label-sm text-label-sm-mobile text-on-surface-variant truncate uppercase">
                            {track.artist || "UNKNOWN ARTIST"} •{" "}
                            {track.albumName || "SINGLE"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                        className={`w-9 h-9 border-2 flex items-center justify-center flex-shrink-0 ${
                          isCurrent
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline bg-surface text-on-surface"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {isCurrent && isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNavbar />
    </div>
  );
}
