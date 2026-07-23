"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
import { usePlayer, TrackProfile } from "@/context/PlayerContext";

interface AlbumDetails {
  id: string;
  name: string;
  theme?: string;
  image?: string;
}

export default function AlbumClient() {
  const params = useParams();
  const router = useRouter();
  const albumId = params?.id as string;

  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [albumTracks, setAlbumTracks] = useState<TrackProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!albumId) return;

    if (typeof window !== "undefined") {
      const savedAlbums: AlbumDetails[] = JSON.parse(
        localStorage.getItem("caelum_albums_db") || "[]",
      );
      const savedTracks: TrackProfile[] = JSON.parse(
        localStorage.getItem("caelum_local_db") || "[]",
      );

      // Find target album
      const foundAlbum = savedAlbums.find((a) => a.id === albumId);

      // Filter tracks assigned to this album container
      const matchingTracks = savedTracks.filter(
        (t) =>
          t.albumId === albumId ||
          (foundAlbum && t.albumName === foundAlbum.name),
      );

      if (foundAlbum) {
        setAlbum(foundAlbum);
      } else {
        // Fallback info if album metadata doesn't exist yet
        setAlbum({
          id: albumId,
          name: matchingTracks[0]?.albumName || "CONTAINER MATRIX",
        });
      }

      setAlbumTracks(matchingTracks);
      setLoading(false);
    }
  }, [albumId]);

  // Handle Play for Individual Tracks inside this album context
  const handlePlayTrack = (track: TrackProfile) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      // Pass albumTracks as queueContext so next/previous skips within this album
      playTrack(track, albumTracks);
    }
  };

  // Play All Tracks starting from track #1
  const handlePlayAlbum = () => {
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  // Cover artwork: Track artwork > Theme image > Fallback null
  const coverArt =
    albumTracks.find((t) => t.thumbnail)?.thumbnail || album?.image || null;

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-32 overflow-x-hidden flex flex-col">
      {/* Dynamic Visual Header Banner with Theme Gradient */}
      <div
        className="h-3 w-full border-b-2 border-outline-variant transition-all duration-300"
        style={{
          background:
            album?.theme ||
            "linear-gradient(135deg, var(--primary-container) 0%, var(--surface-container-lowest) 100%)",
        }}
      />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b-4 border-outline-variant px-margin-mobile py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 border-2 border-outline bg-surface-container flex items-center justify-center active-press"
          title="Go Back"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </button>

        <span className="font-label-lg text-label-lg text-primary uppercase font-bold tracking-widest truncate max-w-[200px]">
          {album?.name || "ALBUM VIEW"}
        </span>

        <button
          type="button"
          onClick={() => router.push("/search")}
          className="w-10 h-10 border-2 border-outline bg-surface-container flex items-center justify-center active-press"
          title="Add Tracks"
        >
          <span className="material-symbols-outlined text-secondary">add</span>
        </button>
      </header>

      <main className="px-margin-mobile pt-6 space-y-6 flex-grow">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs uppercase text-on-surface-variant">
            LOADING ALBUM CONTAINER...
          </div>
        ) : (
          <>
            {/* Album Hero Card with Live Theme Gradient & Artwork Pattern */}
            <div
              className="chunky-border p-4 retro-shadow flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden transition-all duration-300"
              style={{
                background: album?.theme || "var(--surface-container)",
              }}
            >
              {/* Optional Theme Pattern Artwork Overlay */}
              {album?.image && (
                <img
                  src={album.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none pixelated"
                />
              )}

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full">
                {/* Album Cover Art Box */}
                <div className="w-32 h-32 chunky-border bg-surface-container-lowest flex-shrink-0 overflow-hidden relative flex items-center justify-center shadow-lg">
                  {coverArt ? (
                    <img
                      src={coverArt}
                      alt={album?.name}
                      className="w-full h-full object-cover pixelated"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-6xl text-outline">
                      album
                    </span>
                  )}
                </div>

                {/* Album Metadata & Actions */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <span className="inline-block px-2 py-0.5 bg-surface-container-lowest text-secondary font-label-sm text-[10px] uppercase font-bold border border-outline">
                    CONTAINER MATRIX
                  </span>
                  <h1 className="font-headline-md text-headline-md text-white drop-shadow-md uppercase font-bold tracking-tight">
                    {album?.name}
                  </h1>
                  <p className="font-label-sm text-label-sm-mobile text-on-surface-variant uppercase bg-surface-container-lowest/60 px-2 py-0.5 inline-block border border-outline/30">
                    {albumTracks.length}{" "}
                    {albumTracks.length === 1
                      ? "TRACK INSTALLED"
                      : "TRACKS INSTALLED"}
                  </p>

                  {albumTracks.length > 0 && (
                    <div className="pt-2 flex justify-center sm:justify-start gap-3">
                      <button
                        type="button"
                        onClick={handlePlayAlbum}
                        className="px-4 py-2 border-2 border-primary bg-primary text-on-primary font-label-sm uppercase font-bold active-press flex items-center gap-2 shadow-md"
                      >
                        <span className="material-symbols-outlined text-lg">
                          play_arrow
                        </span>
                        PLAY ALBUM
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tracklist Table */}
            <section className="space-y-3">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined">queue_music</span>
                TRACK LISTING
              </h2>

              {albumTracks.length === 0 ? (
                <div className="p-8 border-4 border-dashed border-outline-variant text-center bg-surface-container">
                  <p className="font-label-lg text-on-surface-variant uppercase mb-3">
                    THIS ALBUM CONTAINER IS EMPTY
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/search")}
                    className="px-4 py-2 border-2 border-primary text-primary font-label-sm uppercase active-press"
                  >
                    Find Songs to Download
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {albumTracks.map((track, idx) => {
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
                          {/* Index Number / Play Status */}
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

                          {/* Track Thumbnail */}
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

                          {/* Metadata */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-label-lg text-label-lg truncate uppercase font-bold ${
                                isCurrent ? "text-primary" : "text-on-surface"
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="font-label-sm text-label-sm-mobile text-on-surface-variant truncate uppercase">
                              {track.artist || "UNKNOWN ARTIST"}
                            </p>
                          </div>
                        </div>

                        {/* Direct Play/Pause Button */}
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
          </>
        )}
      </main>

      <BottomNavbar />
    </div>
  );
}
