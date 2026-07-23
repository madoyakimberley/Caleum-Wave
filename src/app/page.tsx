"use client";

import {
  useRef,
  useState,
  useEffect,
  MouseEvent as ReactMouseEvent,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNavbar from "@/components/BottomNavbar";
import { useActivity } from "@/context/ActivityContext";
import { usePlayer, TrackProfile } from "@/context/PlayerContext";

interface DisplayAlbum {
  id: string;
  name: string;
  theme?: string;
  image?: string;
  coverImg?: string;
  trackCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasRecentActivity, recentPlayed } = useActivity();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  // --- LOCAL COLLECTION STATE ---
  const [albums, setAlbums] = useState<DisplayAlbum[]>([]);
  const [localTracks, setLocalTracks] = useState<TrackProfile[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAlbums = JSON.parse(
        localStorage.getItem("caelum_albums_db") || "[]",
      );
      const savedTracks: TrackProfile[] = JSON.parse(
        localStorage.getItem("caelum_local_db") || "[]",
      );

      setLocalTracks(savedTracks);

      // Map real local albums with their assigned theme artwork, track cover art, & track counts
      const compiledAlbums: DisplayAlbum[] = savedAlbums.map((alb: any) => {
        const matchingTracks = savedTracks.filter(
          (t: any) => t.albumId === alb.id || t.albumName === alb.name,
        );
        const firstTrackWithCover = matchingTracks.find(
          (t: any) => t.thumbnail,
        );

        return {
          id: alb.id,
          name: alb.name,
          theme: alb.theme,
          image: alb.image,
          coverImg: firstTrackWithCover?.thumbnail || null,
          trackCount: matchingTracks.length,
        };
      });

      setAlbums(compiledAlbums);
    }
  }, []);

  // --- Play Handler for Recently Played Items ---
  const handlePlayRecentItem = (item: any) => {
    // 1. Try to find an exact track in local DB by ID or Title
    let matchingTrack: TrackProfile | undefined = localTracks.find(
      (t) =>
        t.id === item.id ||
        (t.title &&
          item.details?.title &&
          t.title.toLowerCase() === item.details.title.toLowerCase()),
    );

    // 2. Fallback: Build a TrackProfile object directly from recent item details
    if (!matchingTrack) {
      const fallbackFilename = item.details?.filename || `audio-${item.id}.m4a`;

      matchingTrack = {
        id: item.id,
        filename: fallbackFilename,
        title: item.details?.title || "Unknown Track",
        artist: item.details?.artist || "Unknown Artist",
        thumbnail: item.details?.img,
        albumName: "Recent Activity",
      };
    }

    // 3. Toggle if current, or play new track
    if (currentTrack?.id === matchingTrack.id) {
      togglePlayPause();
    } else {
      playTrack(
        matchingTrack,
        localTracks.length > 0 ? localTracks : [matchingTrack],
      );
    }
  };

  // --- POPULATED STATE LOGIC ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // --- EMPTY STATE LOGIC ---
  const [scannerPos, setScannerPos] = useState(0);

  useEffect(() => {
    if (hasRecentActivity) return;

    let pos = 0;
    let direction = 1;
    let animationFrameId: number;

    const animateScanner = () => {
      pos += 0.5 * direction;
      if (pos >= 100 || pos <= 0) {
        direction *= -1;
      }
      setScannerPos(pos);
      animationFrameId = requestAnimationFrame(animateScanner);
    };

    animationFrameId = requestAnimationFrame(animateScanner);

    return () => cancelAnimationFrame(animationFrameId);
  }, [hasRecentActivity]);

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen pb-24 overflow-x-hidden flex flex-col">
      {hasRecentActivity ? (
        // ==========================================
        // POPULATED STATE VIEW
        // ==========================================
        <>
          <header className="w-full top-0 sticky z-50 bg-surface border-b-4 border-outline-variant flex justify-between items-center px-margin-mobile py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary chunky-border flex items-center justify-center overflow-hidden">
                <img
                  className="w-full h-full object-cover pixelated"
                  alt="Avatar"
                  src="/images/avatar.jpg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100";
                  }}
                />
              </div>
              <h1 className="font-headline-md text-headline-md text-primary tracking-tighter">
                Caelum Wave
              </h1>
            </div>
            <button className="w-10 h-10 flex items-center justify-center active:translate-x-1 active:translate-y-1 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">
                settings
              </span>
            </button>
          </header>

          <main className="px-margin-mobile pt-6 space-y-8 flex-grow">
            {/* Search Bar */}
            <section>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    search
                  </span>
                </div>
                <input
                  className="w-full h-14 pl-12 pr-4 bg-surface-container-low chunky-border font-label-lg text-label-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary transition-colors retro-shadow cursor-pointer"
                  placeholder="Search albums, themes..."
                  type="text"
                  readOnly
                  onClick={() => router.push("/search")}
                />
              </div>
            </section>

            {/* Recently Played Section (Playable Cards) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    history
                  </span>
                  Recently Played
                </h2>
              </div>

              <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex gap-4 overflow-x-auto pb-4 snap-x -mx-4 px-4 cursor-grab active:cursor-grabbing select-none"
              >
                {recentPlayed.map((item) => {
                  const isCurrent =
                    currentTrack?.id === item.id ||
                    (currentTrack?.title &&
                      item.details?.title &&
                      currentTrack.title.toLowerCase() ===
                        item.details.title.toLowerCase());

                  return (
                    <div
                      key={item.id}
                      onClick={() => handlePlayRecentItem(item)}
                      className="flex-shrink-0 w-64 snap-start cursor-pointer"
                    >
                      <div
                        className={`chunky-border bg-surface-container-high p-2 retro-shadow group active-press relative transition-all ${
                          isCurrent
                            ? "border-primary bg-primary-container/20"
                            : ""
                        }`}
                      >
                        <div className="aspect-square w-full chunky-border overflow-hidden mb-3 pointer-events-none bg-surface-container-lowest relative">
                          <img
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              isCurrent
                                ? "grayscale-0 scale-105"
                                : "grayscale group-hover:grayscale-0"
                            }`}
                            src={item.details?.img || "/images/neon-drift.png"}
                            alt={item.details?.title || "Track Cover"}
                          />

                          {/* Play / Pause Status Overlay Indicator */}
                          <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                              isCurrent
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-outline shadow-lg">
                              <span className="material-symbols-outlined text-3xl">
                                {isCurrent && isPlaying
                                  ? "pause"
                                  : "play_arrow"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="font-label-lg text-label-lg text-primary truncate uppercase font-bold">
                          {item.details?.title || "Untitled Track"}
                        </p>
                        <p className="font-label-sm text-label-sm-mobile text-on-surface-variant uppercase truncate">
                          {item.details?.artist || "Unknown Artist"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Your Collection (Albums with Theme Art) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-secondary uppercase tracking-widest flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    library_music
                  </span>
                  Your Collection ({albums.length})
                </h2>
              </div>

              {albums.length === 0 ? (
                <div className="p-6 border-4 border-dashed border-outline-variant text-center bg-surface-container">
                  <p className="font-label-lg text-on-surface-variant uppercase">
                    NO ALBUM CONTAINERS CREATED
                  </p>
                  <button
                    onClick={() => router.push("/search")}
                    className="mt-3 px-4 py-2 border-2 border-primary text-primary font-label-sm uppercase active-press"
                  >
                    Install Music & Create Album
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {albums.map((alb) => {
                    const displayArt = alb.image || alb.coverImg;

                    return (
                      <div
                        key={alb.id}
                        onClick={() => router.push(`/album/${alb.id}`)}
                        className="chunky-border bg-surface-container p-2 retro-shadow active-press cursor-pointer relative overflow-hidden group"
                      >
                        {/* Theme Matrix Gradient Bar */}
                        <div
                          className="h-2 w-full mb-2 border-b-2 border-outline-variant"
                          style={{
                            background:
                              alb.theme ||
                              "linear-gradient(135deg, var(--primary-container) 0%, var(--surface-container-lowest) 100%)",
                          }}
                        />

                        {/* Album Image / Cover Box */}
                        <div className="aspect-square chunky-border mb-2 overflow-hidden bg-surface-container-lowest flex items-center justify-center relative">
                          {displayArt ? (
                            <img
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform pixelated"
                              src={displayArt}
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
                          {alb.trackCount}{" "}
                          {alb.trackCount === 1 ? "TRACK" : "TRACKS"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </>
      ) : (
        // ==========================================
        // EMPTY STATE VIEW
        // ==========================================
        <>
          <Header />
          <main className="flex-grow pt-20 px-margin-mobile flex flex-col items-center justify-center text-center dither-bg">
            <div className="w-full max-w-sm aspect-square mb-8 relative">
              <div className="absolute inset-0 bevel-raised bg-surface-container-lowest flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/welcome.jpg"
                  alt="Welcome Illustration"
                  fill
                  className="object-cover opacity-80"
                  priority
                />
                <div
                  className="absolute inset-x-0 h-1 bg-primary opacity-20"
                  style={{ top: `${scannerPos}%` }}
                ></div>
              </div>

              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-secondary"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-secondary"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-secondary"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-secondary"></div>
            </div>

            <div className="space-y-4 max-w-xs mb-10">
              <div className="inline-block px-2 py-1 bg-surface-container-highest border-2 border-primary mb-2">
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
                  Signal Status: Null
                </span>
              </div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background tracking-tighter">
                NO WAVES FOUND<span className="pixel-cursor"></span>
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your signal is quiet. Start your collection by browsing the
                library or discovering new sounds online.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <button
                onClick={() => router.push("/search")}
                className="w-full py-4 bevel-raised bg-primary text-on-primary font-headline-md text-headline-md uppercase active-press transition-all hover:bg-primary-container"
              >
                INSTALL YOUR FIRST SONG
              </button>
            </div>

            <div className="mt-12 opacity-50">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                V. 0.8.4 - WAITING FOR INPUT...
              </p>
            </div>
          </main>
        </>
      )}

      <BottomNavbar />
    </div>
  );
}
