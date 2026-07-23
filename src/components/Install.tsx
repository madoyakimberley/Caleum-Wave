"use client";

import { useState, useEffect, useRef } from "react";
import { useActivity } from "@/context/ActivityContext";
import { usePlayer } from "@/context/PlayerContext";
import AlbumPicker, { AlbumContainer } from "./AlbumPicker";
import { PRESET_THEMES } from "./ThemePicker";
import { saveAudioFileToDisk } from "@/utils/fileStorage";
import { getOrFetchAudioUrl } from "@/utils/cacheStorage";

interface OnlineTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface AuthModalData {
  verificationUrl: string;
  userCode: string;
}

export default function Install({ searchQuery }: { searchQuery: string }) {
  const { addActivity } = useActivity();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [searchResults, setSearchResults] = useState<OnlineTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<OnlineTrack | null>(null);

  const [sanitizedTitle, setSanitizedTitle] = useState("");
  const [sanitizedArtist, setSanitizedArtist] = useState("");

  const [albums, setAlbums] = useState<AlbumContainer[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [createNewAlbum, setCreateNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");

  const [selectedTheme, setSelectedTheme] = useState<string>(
    PRESET_THEMES[0].gradient,
  );
  const [selectedThemeImage, setSelectedThemeImage] = useState<string>(
    PRESET_THEMES[0].image,
  );

  const [authData, setAuthData] = useState<AuthModalData | null>(null);
  const [handshakeStatus, setHandshakeStatus] = useState(
    "INITIALIZING STREAM...",
  );
  const [bufferingTrackId, setBufferingTrackId] = useState<string | null>(null);

  // Reference for 5-second preview auto-stop timer
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAlbums = JSON.parse(
        localStorage.getItem("caelum_albums_db") || "[]",
      );
      if (savedAlbums.length > 0) {
        setAlbums(savedAlbums);
        setSelectedAlbumId(savedAlbums[0].id);
      }
    }

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchLiveStream = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Discovery error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchLiveStream, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const parseTrackMetadata = (rawTitle: string, rawArtist: string) => {
    let cleanArtist = rawArtist
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/VEVO$/i, "")
      .trim();
    let cleanTitle = rawTitle
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(
        /(official|music|video|hq|hd|remastered|remaster|live|20\d\d|4k|lyric|lyrics|audio|full video)/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();

    const delimiters = [" - ", " – ", " — ", " : "];
    let foundSplit = false;

    for (const delim of delimiters) {
      if (cleanTitle.includes(delim)) {
        const parts = cleanTitle.split(delim);
        if (parts.length >= 2) {
          cleanArtist = parts[0].trim().toUpperCase();
          cleanTitle = parts.slice(1).join(" ").trim().toUpperCase();
          foundSplit = true;
          break;
        }
      }
    }

    if (!foundSplit) {
      cleanArtist = cleanArtist.toUpperCase();
      cleanTitle = cleanTitle.toUpperCase();
    }

    return { title: cleanTitle, artist: cleanArtist };
  };

  // Modern Stream Handler with 5-Second Preview Cap
  const handlePlayOnlineTrack = async (track: OnlineTrack) => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (currentTrack?.id === track.id) {
      togglePlayPause();
      return;
    }

    try {
      setBufferingTrackId(track.id);
      const audioUrl = await getOrFetchAudioUrl(track.id);
      const parsed = parseTrackMetadata(track.title, track.artist);

      playTrack({
        id: track.id,
        title: parsed.title,
        artist: parsed.artist,
        thumbnail: track.thumbnail,
        url: audioUrl,
        isOnline: true,
      } as any);

      // Automatically pause stream preview after 5 seconds
      previewTimerRef.current = setTimeout(() => {
        togglePlayPause();
      }, 5000);
    } catch (err: any) {
      console.error("Stream caching error:", err);
      alert(
        `STREAM ERROR: ${err.message || "Failed to load cached audio stream."}`,
      );
    } finally {
      setBufferingTrackId(null);
    }
  };

  const handleStartInstall = (track: OnlineTrack) => {
    // Clear preview timer & stop audio stream to prevent socket collisions
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (isPlaying) {
      togglePlayPause();
    }

    setSelectedTrack(track);
    const parsed = parseTrackMetadata(track.title, track.artist);
    setSanitizedTitle(parsed.title);
    setSanitizedArtist(parsed.artist);
    setCurrentStep(2);
  };

  const handleConfirmMetadata = () => {
    if (!sanitizedTitle.trim()) return;
    if (albums.length === 0) setCreateNewAlbum(true);
    setCurrentStep(3);
  };

  const handleFinalizeSave = async () => {
    if (!selectedTrack) return;

    const trackId = selectedTrack.id || "";
    if (!trackId || trackId.startsWith("PL") || trackId.includes("list=PL")) {
      alert("Cannot process playlist folders.");
      setSelectedTrack(null);
      setCurrentStep(1);
      return;
    }

    if (createNewAlbum) {
      const trimmedNewName = newAlbumName.trim().toUpperCase();
      if (!trimmedNewName) {
        alert("Please enter a valid name for the new album.");
        return;
      }
      if (albums.some((a) => a.name.trim().toUpperCase() === trimmedNewName)) {
        alert(`An album named "${trimmedNewName}" already exists!`);
        return;
      }
    }

    setCurrentStep(4);

    try {
      let targetAlbumId = selectedAlbumId;
      let resolvedAlbumName =
        albums.find((a) => a.id === selectedAlbumId)?.name || "MY COLLECTION";

      if (createNewAlbum) {
        resolvedAlbumName = newAlbumName.trim().toUpperCase();
        targetAlbumId = `alb_${Date.now()}`;

        const newAlbObj: AlbumContainer = {
          id: targetAlbumId,
          name: resolvedAlbumName,
          theme: selectedTheme,
          image: selectedThemeImage,
        };

        const updatedAlbums = [...albums, newAlbObj];
        setAlbums(updatedAlbums);
        localStorage.setItem("caelum_albums_db", JSON.stringify(updatedAlbums));
      }

      setHandshakeStatus("DOWNLOADING FROM YOUTUBE...");
      const downloadRes = await fetch(
        `/api/download?id=${encodeURIComponent(trackId)}`,
      );
      const contentType = downloadRes.headers.get("content-type") || "";
      const rawBlob = await downloadRes.blob();

      // Inspection guard for JSON errors, HTML block pages, or small files (<50KB)
      if (
        !downloadRes.ok ||
        rawBlob.size < 50000 ||
        contentType.includes("application/json") ||
        contentType.includes("text/html")
      ) {
        const responseText = await rawBlob.text();
        let errorMessage = "Downloaded audio payload was invalid or corrupted.";

        try {
          const jsonResponse = JSON.parse(responseText);

          if (jsonResponse.authRequired) {
            setAuthData({
              verificationUrl: jsonResponse.verificationUrl,
              userCode: jsonResponse.userCode,
            });
            setHandshakeStatus("AWAITING GOOGLE ACCOUNT PAIRING...");
            return;
          }

          if (jsonResponse.error) errorMessage = jsonResponse.error;
        } catch {
          if (
            responseText.includes("<html") ||
            responseText.includes("Sign in")
          ) {
            errorMessage =
              "YouTube rate-limited or blocked this request. Please try again shortly.";
          }
        }

        throw new Error(errorMessage);
      }

      const validMimeType = contentType.startsWith("audio/")
        ? contentType
        : "audio/mp4";
      const audioBlob = new Blob([rawBlob], { type: validMimeType });

      let fileExt = "m4a";
      if (validMimeType.includes("webm")) fileExt = "webm";
      else if (validMimeType.includes("mpeg") || validMimeType.includes("mp3"))
        fileExt = "mp3";

      const physicalFilename = `audio-${trackId}.${fileExt}`;

      setHandshakeStatus("SAVING TO PHONE DISK STORAGE...");
      await saveAudioFileToDisk(physicalFilename, audioBlob);

      const downloadUrl = URL.createObjectURL(audioBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `${sanitizedArtist} - ${sanitizedTitle}.${fileExt}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      const trackProfile = {
        id: trackId,
        filename: physicalFilename,
        blobKey: physicalFilename,
        title: sanitizedTitle,
        artist: sanitizedArtist,
        albumId: targetAlbumId,
        albumName: resolvedAlbumName,
        thumbnail: selectedTrack.thumbnail,
        downloadedAt: new Date().toISOString(),
      };

      const currentLib: any[] = JSON.parse(
        localStorage.getItem("caelum_local_db") || "[]",
      );
      const cleanedLib = currentLib.filter((item) => item.id !== trackId);
      localStorage.setItem(
        "caelum_local_db",
        JSON.stringify([...cleanedLib, trackProfile]),
      );

      addActivity("INSTALL_SONG", {
        title: sanitizedTitle,
        artist: sanitizedArtist,
        albumName: resolvedAlbumName,
        coverImg: selectedTrack.thumbnail,
      } as any);

      setSelectedTrack(null);
      setNewAlbumName("");
      setCreateNewAlbum(false);
      setAuthData(null);
      setCurrentStep(1);
    } catch (error: any) {
      console.error("Storage Handshake Error:", error);
      alert(`DOWNLOAD FAILURE: ${error.message}`);
      setAuthData(null);
      setCurrentStep(1);
    }
  };

  return (
    <section className="space-y-4 relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-secondary" />
        <h2 className="font-headline-md text-headline-md text-secondary uppercase">
          {currentStep === 1 && "ONLINE DISCOVERY STREAM"}
          {currentStep === 2 && "STEP 1: METADATA INSPECTOR"}
          {currentStep === 3 && "STEP 2: ALBUM ASSIGNMENT"}
          {currentStep === 4 && "SAVING TO PHONE DISK"}
        </h2>
      </div>

      {/* STEP 1: Search, Play & Download */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 gap-3">
          {isSearching && (
            <div className="p-6 border-4 border-dashed border-outline-variant text-center bg-surface-container">
              <p className="font-label-lg text-primary animate-pulse">
                SEARCHING YOUTUBE...
              </p>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className="p-6 border-4 border-dashed border-outline-variant text-center bg-surface-container">
              <p className="font-label-lg text-on-surface-variant uppercase">
                {searchQuery ? "NO TRACKS FOUND" : "TYPE A QUERY TO SEARCH"}
              </p>
            </div>
          )}

          {!isSearching &&
            searchResults.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isBufferingThis = bufferingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className="bg-surface-container-high border-4 border-outline p-3 flex justify-between items-center group"
                >
                  <div
                    onClick={() => handlePlayOnlineTrack(track)}
                    className="flex items-center gap-3 min-w-0 flex-1 pr-2 cursor-pointer"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 object-cover border-2 border-primary flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-label-lg truncate font-bold ${
                          isCurrent ? "text-primary" : "text-on-surface"
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-label-sm font-label-sm text-secondary truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Play/Pause 5s Preview Button */}
                    <button
                      type="button"
                      disabled={isBufferingThis}
                      onClick={() => handlePlayOnlineTrack(track)}
                      className={`w-10 h-10 border-2 flex items-center justify-center transition-all active-press ${
                        isCurrent
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant bg-surface-container hover:border-primary text-primary"
                      }`}
                      title="5s Preview"
                    >
                      <span className="material-symbols-outlined">
                        {isBufferingThis ? (
                          <span className="animate-spin text-sm">sync</span>
                        ) : isCurrent && isPlaying ? (
                          "pause"
                        ) : (
                          "play_arrow"
                        )}
                      </span>
                    </button>

                    {/* Download Button */}
                    <button
                      type="button"
                      onClick={() => handleStartInstall(track)}
                      className="w-10 h-10 bg-surface-container border-2 border-outline-variant flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all active-press"
                      title="Install Track"
                    >
                      <span className="material-symbols-outlined">
                        download
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* STEP 2: Title / Artist Confirmation */}
      {currentStep === 2 && selectedTrack && (
        <div className="bg-surface-container border-4 border-outline-variant p-4 space-y-4">
          <p className="font-label-sm text-on-surface-variant uppercase">
            CONFIRM METADATA:
          </p>
          <div className="space-y-3">
            <div>
              <label className="font-label-sm text-outline block mb-1">
                TRACK TITLE
              </label>
              <input
                type="text"
                value={sanitizedTitle}
                onChange={(e) => setSanitizedTitle(e.target.value)}
                className="w-full p-3 bg-surface-container-lowest border-4 border-outline-variant text-primary font-label-lg uppercase focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
            <div>
              <label className="font-label-sm text-outline block mb-1">
                ARTIST NAME
              </label>
              <input
                type="text"
                value={sanitizedArtist}
                onChange={(e) => setSanitizedArtist(e.target.value)}
                className="w-full p-3 bg-surface-container-lowest border-4 border-outline-variant text-secondary font-label-lg uppercase focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="active-press px-4 py-2 border-2 border-outline-variant text-on-surface-variant font-label-sm uppercase"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleConfirmMetadata}
              className="active-press px-6 py-2 border-4 border-primary bg-primary text-on-primary font-label-lg uppercase"
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Album Container Guard */}
      {currentStep === 3 && (
        <div className="bg-surface-container border-4 border-outline-variant p-4 space-y-4">
          <AlbumPicker
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            onSelectAlbumId={setSelectedAlbumId}
            createNewAlbum={createNewAlbum}
            setCreateNewAlbum={setCreateNewAlbum}
            newAlbumName={newAlbumName}
            setNewAlbumName={setNewAlbumName}
            selectedTheme={selectedTheme}
            setSelectedTheme={setSelectedTheme}
            selectedThemeImage={selectedThemeImage}
            setSelectedThemeImage={setSelectedThemeImage}
          />
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="active-press px-4 py-2 border-2 border-outline-variant text-on-surface-variant font-label-sm uppercase"
            >
              BACK
            </button>
            <button
              type="button"
              onClick={handleFinalizeSave}
              className="active-press px-6 py-2 border-4 border-secondary bg-secondary text-on-secondary font-label-lg uppercase"
            >
              INSTALL TO PHONE
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Download Progress */}
      {currentStep === 4 && (
        <div className="bg-surface-container border-4 border-outline p-6 text-center space-y-4">
          <div className="flex justify-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              sync
            </span>
          </div>
          <p className="font-label-lg text-primary uppercase">
            {handshakeStatus}
          </p>
          <div className="w-full h-4 border-2 border-outline bg-surface-container-lowest overflow-hidden">
            <div className="h-full bg-secondary w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Google Device Auth Modal */}
      {authData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container border-4 border-outline p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <h3 className="font-headline-md text-headline-md text-primary uppercase">
              YOUTUBE DEVICE PAIRING
            </h3>
            <div className="p-3 bg-surface-container-lowest border-4 border-secondary text-secondary font-mono text-2xl font-bold tracking-widest select-all">
              {authData.userCode}
            </div>
            <div className="space-y-2 pt-2">
              <a
                href={authData.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 border-4 border-primary bg-primary text-on-primary font-label-lg uppercase text-center active-press"
              >
                OPEN GOOGLE AUTH PAGE ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setAuthData(null);
                  handleFinalizeSave();
                }}
                className="w-full py-3 border-4 border-secondary bg-secondary text-on-secondary font-label-lg uppercase active-press"
              >
                I'VE AUTHORIZED, RESUME
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
