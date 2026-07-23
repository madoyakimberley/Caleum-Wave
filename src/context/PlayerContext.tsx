"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { getAudioFileFromDisk } from "@/utils/fileStorage";

export interface TrackProfile {
  id: string;
  filename?: string;
  title: string;
  artist: string;
  albumId?: string;
  albumName?: string;
  thumbnail?: string;
  downloadedAt?: string;
  audioUrl?: string;
  url?: string;
  isOnline?: boolean;
}

export type AmplifierMode = "standard" | "crazy-boom" | "havy-bass" | "4k";

interface PlayerContextType {
  currentTrack: TrackProfile | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: TrackProfile[];
  currentIndex: number;
  gain: number;
  bassBoost: number;
  amplifierMode: AmplifierMode;
  setGain: (level: number) => void;
  setBassBoost: (dB: number) => void;
  setAmplifierMode: (mode: AmplifierMode) => void;
  playTrack: (track: TrackProfile, queueContext?: TrackProfile[]) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio API References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const subsonicFilterRef = useRef<BiquadFilterNode | null>(null);
  const subBassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midThumpFilterRef = useRef<BiquadFilterNode | null>(null);
  const vocalClarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const crystalHighsFilterRef = useRef<BiquadFilterNode | null>(null);
  const delayLeftRef = useRef<DelayNode | null>(null);
  const delayRightRef = useRef<DelayNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  const [currentTrack, setCurrentTrack] = useState<TrackProfile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<TrackProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [activeObjectUrl, setActiveObjectUrl] = useState<string | null>(null);

  // Amplification state
  const [gain, setGainState] = useState<number>(1);
  const [bassBoost, setBassBoostState] = useState<number>(0);
  const [amplifierMode, setAmplifierModeState] =
    useState<AmplifierMode>("standard");

  // Load saved settings on mount
  useEffect(() => {
    const savedGain = localStorage.getItem("player_gain");
    const savedBass = localStorage.getItem("player_bass");
    const savedAmpMode = localStorage.getItem(
      "player_amp_mode",
    ) as AmplifierMode | null;

    if (savedGain) setGainState(parseFloat(savedGain));
    if (savedBass) setBassBoostState(parseFloat(savedBass));
    if (
      savedAmpMode &&
      ["standard", "crazy-boom", "havy-bass", "4k"].includes(savedAmpMode)
    ) {
      setAmplifierModeState(savedAmpMode);
    }
  }, []);

  // Initialization of Sound Amplifiers Audio Graph
  const initWebAudio = () => {
    if (!audioRef.current || audioCtxRef.current) return;

    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioRef.current);

      // 1. Subsonic Highpass (25Hz) - Removes hardware choking sub-audible mud
      const subsonicFilter = ctx.createBiquadFilter();
      subsonicFilter.type = "highpass";
      subsonicFilter.frequency.value = 25;

      // 2. Sub-Bass Filter (Low-shelf)
      const subBassFilter = ctx.createBiquadFilter();

      // 3. Mid-Bass Thump Filter (Peaking)
      const midThumpFilter = ctx.createBiquadFilter();

      // 4. Vocal Isolation Filter (Peaking)
      const vocalClarityFilter = ctx.createBiquadFilter();

      // 5. Crystal Highs Filter (High-shelf)
      const crystalHighsFilter = ctx.createBiquadFilter();

      // 6. Spatial Delay Expansion Nodes
      const channelSplitter = ctx.createChannelSplitter(2);
      const channelMerger = ctx.createChannelMerger(2);
      const delayLeft = ctx.createDelay();
      const delayRight = ctx.createDelay();

      // 7. Gain Node
      const gainNode = ctx.createGain();

      // 8. Brickwall Safety Output Limiter (Prevents all digital clipping)
      const compressor = ctx.createDynamicsCompressor();

      // Connect Signal Chain
      source.connect(subsonicFilter);
      subsonicFilter.connect(subBassFilter);
      subBassFilter.connect(midThumpFilter);
      midThumpFilter.connect(vocalClarityFilter);
      vocalClarityFilter.connect(crystalHighsFilter);

      // Spatial Routing Chain
      crystalHighsFilter.connect(channelSplitter);
      channelSplitter.connect(delayLeft, 0);
      channelSplitter.connect(delayRight, 1);
      delayLeft.connect(channelMerger, 0, 0);
      delayRight.connect(channelMerger, 0, 1);

      // Master Output Chain
      channelMerger.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(ctx.destination);

      audioCtxRef.current = ctx;
      subsonicFilterRef.current = subsonicFilter;
      subBassFilterRef.current = subBassFilter;
      midThumpFilterRef.current = midThumpFilter;
      vocalClarityFilterRef.current = vocalClarityFilter;
      crystalHighsFilterRef.current = crystalHighsFilter;
      delayLeftRef.current = delayLeft;
      delayRightRef.current = delayRight;
      gainNodeRef.current = gainNode;
      compressorNodeRef.current = compressor;

      applyAmplifierProfile(amplifierMode, gain, bassBoost);
    } catch (err) {
      console.error("[Sound Amplifiers] Initialization error:", err);
    }
  };

  const applyAmplifierProfile = (
    mode: AmplifierMode,
    currentGainVal: number,
    currentBassVal: number,
  ) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    let peakBoostDb = 0;

    if (mode === "4k") {
      peakBoostDb = 14; // Sub-Bass max boost (+14dB)
      if (subBassFilterRef.current) {
        subBassFilterRef.current.type = "lowshelf";
        subBassFilterRef.current.frequency.value = 40;
        subBassFilterRef.current.gain.value = 14;
      }
      if (midThumpFilterRef.current) {
        midThumpFilterRef.current.type = "peaking";
        midThumpFilterRef.current.frequency.value = 65;
        midThumpFilterRef.current.Q.value = 2.0;
        midThumpFilterRef.current.gain.value = 8;
      }
      if (vocalClarityFilterRef.current) {
        vocalClarityFilterRef.current.type = "peaking";
        vocalClarityFilterRef.current.frequency.value = 2200;
        vocalClarityFilterRef.current.Q.value = 1.2;
        vocalClarityFilterRef.current.gain.value = 4.5;
      }
      if (crystalHighsFilterRef.current) {
        crystalHighsFilterRef.current.type = "highshelf";
        crystalHighsFilterRef.current.frequency.value = 11000;
        crystalHighsFilterRef.current.gain.value = 5.0;
      }
      if (delayLeftRef.current)
        delayLeftRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
      if (delayRightRef.current)
        delayRightRef.current.delayTime.setValueAtTime(0.025, ctx.currentTime);
    } else if (mode === "havy-bass") {
      peakBoostDb = 15; // Max boost (+15dB)
      if (subBassFilterRef.current) {
        subBassFilterRef.current.type = "lowshelf";
        subBassFilterRef.current.frequency.value = 60;
        subBassFilterRef.current.gain.value = 15;
      }
      if (midThumpFilterRef.current) {
        midThumpFilterRef.current.type = "peaking";
        midThumpFilterRef.current.frequency.value = 1000;
        midThumpFilterRef.current.Q.value = 1.0;
        midThumpFilterRef.current.gain.value = 0;
      }
      if (vocalClarityFilterRef.current) {
        vocalClarityFilterRef.current.type = "peaking";
        vocalClarityFilterRef.current.frequency.value = 2000;
        vocalClarityFilterRef.current.Q.value = 1.0;
        vocalClarityFilterRef.current.gain.value = 3.5;
      }
      if (crystalHighsFilterRef.current) {
        crystalHighsFilterRef.current.type = "highshelf";
        crystalHighsFilterRef.current.frequency.value = 10000;
        crystalHighsFilterRef.current.gain.value = 4.0;
      }
      if (delayLeftRef.current)
        delayLeftRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
      if (delayRightRef.current)
        delayRightRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
    } else if (mode === "crazy-boom") {
      peakBoostDb = 9; // Max boost (+9dB)
      if (subBassFilterRef.current) {
        subBassFilterRef.current.type = "lowshelf";
        subBassFilterRef.current.frequency.value = 45;
        subBassFilterRef.current.gain.value = 9;
      }
      if (midThumpFilterRef.current) {
        midThumpFilterRef.current.type = "peaking";
        midThumpFilterRef.current.frequency.value = 85;
        midThumpFilterRef.current.Q.value = 1.2;
        midThumpFilterRef.current.gain.value = 4.5;
      }
      if (vocalClarityFilterRef.current) {
        vocalClarityFilterRef.current.type = "peaking";
        vocalClarityFilterRef.current.frequency.value = 1000;
        vocalClarityFilterRef.current.Q.value = 1.0;
        vocalClarityFilterRef.current.gain.value = 0;
      }
      if (crystalHighsFilterRef.current) {
        crystalHighsFilterRef.current.type = "highshelf";
        crystalHighsFilterRef.current.frequency.value = 10000;
        crystalHighsFilterRef.current.gain.value = 0;
      }
      if (delayLeftRef.current)
        delayLeftRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
      if (delayRightRef.current)
        delayRightRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
    } else {
      peakBoostDb = currentBassVal;
      if (subBassFilterRef.current) {
        subBassFilterRef.current.type = "lowshelf";
        subBassFilterRef.current.frequency.value = 45;
        subBassFilterRef.current.gain.value = currentBassVal;
      }
      if (midThumpFilterRef.current) {
        midThumpFilterRef.current.type = "peaking";
        midThumpFilterRef.current.frequency.value = 1000;
        midThumpFilterRef.current.Q.value = 1.0;
        midThumpFilterRef.current.gain.value = 0;
      }
      if (vocalClarityFilterRef.current) {
        vocalClarityFilterRef.current.type = "peaking";
        vocalClarityFilterRef.current.frequency.value = 1000;
        vocalClarityFilterRef.current.Q.value = 1.0;
        vocalClarityFilterRef.current.gain.value = 0;
      }
      if (crystalHighsFilterRef.current) {
        crystalHighsFilterRef.current.type = "highshelf";
        crystalHighsFilterRef.current.frequency.value = 10000;
        crystalHighsFilterRef.current.gain.value = 0;
      }
      if (delayLeftRef.current)
        delayLeftRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
      if (delayRightRef.current)
        delayRightRef.current.delayTime.setValueAtTime(0.0, ctx.currentTime);
    }

    // --- AUTOMATIC DIGITAL HEADROOM FORMULA ---
    const headroomFactor = Math.pow(10, -peakBoostDb / 20);
    const targetGain = currentGainVal * headroomFactor * 0.85;

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        targetGain,
        ctx.currentTime,
        0.01,
      );
    }

    // --- BRICKWALL PEAK LIMITER CONFIGURATION ---
    if (compressorNodeRef.current) {
      compressorNodeRef.current.threshold.setValueAtTime(-1.5, ctx.currentTime);
      compressorNodeRef.current.knee.setValueAtTime(3.0, ctx.currentTime);
      compressorNodeRef.current.ratio.setValueAtTime(20.0, ctx.currentTime);
      compressorNodeRef.current.attack.setValueAtTime(0.001, ctx.currentTime);
      compressorNodeRef.current.release.setValueAtTime(0.08, ctx.currentTime);
    }
  };

  const setGain = (level: number) => {
    setGainState(level);
    localStorage.setItem("player_gain", level.toString());
    applyAmplifierProfile(amplifierMode, level, bassBoost);
  };

  const setBassBoost = (dB: number) => {
    setBassBoostState(dB);
    localStorage.setItem("player_bass", dB.toString());
    applyAmplifierProfile(amplifierMode, gain, dB);
  };

  const setAmplifierMode = (mode: AmplifierMode) => {
    setAmplifierModeState(mode);
    localStorage.setItem("player_amp_mode", mode);
    applyAmplifierProfile(mode, gain, bassBoost);
  };

  const ensureAudioContextResumed = async () => {
    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  };

  const playTrack = async (
    track: TrackProfile,
    queueContext?: TrackProfile[],
  ) => {
    const audio = audioRef.current;
    if (!audio) return;

    await ensureAudioContextResumed();

    let newQueue = queueContext || queue;
    if (newQueue.length === 0) newQueue = [track];
    setQueue(newQueue);

    const index = newQueue.findIndex((t) => t.id === track.id);
    setCurrentIndex(index !== -1 ? index : 0);
    setCurrentTrack(track);

    let audioSrc: string | null = null;
    const streamUrl = track.url || track.audioUrl;

    // 1. ONLINE STREAM / CACHED BLOB CHECK
    if (
      track.isOnline ||
      (streamUrl &&
        (streamUrl.startsWith("/api/") ||
          streamUrl.startsWith("http") ||
          streamUrl.startsWith("blob:")))
    ) {
      audioSrc = streamUrl || null;
    } else {
      // 2. DISK STORAGE READ: Fetch from OPFS storage for installed local files
      const targetFilename = track.filename || `audio-${track.id}.m4a`;

      try {
        const audioFile = await getAudioFileFromDisk(targetFilename);

        if (audioFile && audioFile.size > 50000) {
          audioSrc = URL.createObjectURL(audioFile);
        } else {
          console.error(
            `[DISK ERROR] File "${targetFilename}" is missing or corrupt.`,
          );
        }
      } catch (err) {
        console.error(
          `[DISK READ ERROR] Could not read ${targetFilename}:`,
          err,
        );
      }
    }

    if (!audioSrc) {
      setIsPlaying(false);
      alert(
        `Unable to play "${track.title}". File is missing from device storage or invalid stream.`,
      );
      return;
    }

    if (activeObjectUrl && activeObjectUrl !== audioSrc) {
      URL.revokeObjectURL(activeObjectUrl);
    }
    setActiveObjectUrl(audioSrc.startsWith("blob:") ? audioSrc : null);

    audio.src = audioSrc;
    audio.load();

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
      setIsPlaying(false);
    }

    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.albumName || "Caelum Wave",
        artwork: track.thumbnail
          ? [{ src: track.thumbnail, sizes: "512x512", type: "image/png" }]
          : [],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        ensureAudioContextResumed();
        audio.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        previousTrack(),
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seek(details.seekTime);
        }
      });
    }
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    await ensureAudioContextResumed();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const nextTrack = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    const nextIdx = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIdx], queue);
  };

  const previousTrack = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    playTrack(queue[prevIdx], queue);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      if (duration > 0 && !isNaN(currentTime)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: Math.min(currentTime, duration),
          });
        } catch (e) {
          // Ignored
        }
      }
    }
  }, [isPlaying, currentTime, duration]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        queue,
        currentIndex,
        gain,
        bassBoost,
        amplifierMode,
        setGain,
        setBassBoost,
        setAmplifierMode,
        playTrack,
        togglePlayPause,
        seek,
        nextTrack,
        previousTrack,
      }}
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={() =>
          audioRef.current && setCurrentTime(audioRef.current.currentTime)
        }
        onLoadedMetadata={() =>
          audioRef.current && setDuration(audioRef.current.duration || 0)
        }
        onEnded={nextTrack}
        onError={() => {
          const mediaErr = audioRef.current?.error;
          console.warn(
            `[Audio Engine] Stream load error [Code ${mediaErr?.code || 4}]. Clearing source to prevent demuxer crash...`,
          );

          // Immediately pause and detach source from native HTML5 player
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute("src");
            audioRef.current.load();
          }

          setIsPlaying(false);

          // Automatically skip to the next track if available in queue
          if (queue.length > 1 && currentIndex !== -1) {
            const nextIdx = (currentIndex + 1) % queue.length;
            playTrack(queue[nextIdx], queue);
          }
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
