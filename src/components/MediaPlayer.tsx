"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function MediaPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    gain,
    bassBoost,
    amplifierMode,
    setGain,
    setBassBoost,
    setAmplifierMode,
    togglePlayPause,
    seek,
    nextTrack,
    previousTrack,
  } = usePlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showAmpControls, setShowAmpControls] = useState(false);

  const [isIdleHidden, setIsIdleHidden] = useState(false);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    if (!isPlaying && !isExpanded && currentTrack) {
      idleTimer = setTimeout(() => {
        setIsIdleHidden(true);
      }, 5000);
    } else {
      setIsIdleHidden(false);
    }

    return () => clearTimeout(idleTimer);
  }, [isPlaying, isExpanded, currentTrack]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const gainPercentage = Math.round(gain * 100);
  const totalSegments = 38;
  const activeSegments = Math.round((progressPercent / 100) * totalSegments);

  const getAmplifierBadgeLabel = () => {
    switch (amplifierMode) {
      case "4k":
        return "4K THEATER";
      case "havy-bass":
        return "HAVYBASS";
      case "crazy-boom":
        return "CRAZY BOOM";
      default:
        return "STANDARD";
    }
  };

  return (
    <>
      {/* =========================================================================
          1. FULLSCREEN / DECK PLAYER VIEW (EXPANDED)
         ========================================================================= */}
      {isExpanded ? (
        <div className="fixed inset-0 z-[10000] bg-[#120f1d] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Top Bar Header with Minimize & Amplifiers Panel Toggle */}
          <div className="w-full max-w-sm flex justify-between items-center mb-3 gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 text-xs font-mono text-purple-300 hover:text-white uppercase transition-colors py-1 px-2 border border-purple-800/40 bg-purple-950/30"
            >
              <span className="material-symbols-outlined text-sm">
                expand_more
              </span>
              MINIMIZE
            </button>

            {/* Sound Amplifiers Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAmpControls((prev) => !prev)}
              className={`px-3 py-1 border text-[10px] font-mono font-bold uppercase transition-all ${
                amplifierMode !== "standard" || showAmpControls
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-purple-800/80 bg-purple-950/40 text-purple-300 hover:border-purple-500"
              }`}
            >
              AMPLIFIERS ({getAmplifierBadgeLabel()})
            </button>
          </div>

          {/* Collapsible Sound Amplifiers Panel */}
          {showAmpControls && (
            <div className="w-full max-w-sm mb-4 p-3.5 bg-[#1c162e] border-2 border-purple-800 text-purple-200 flex flex-col gap-3 font-mono text-xs shadow-2xl relative">
              <div className="flex justify-between items-center text-amber-400 font-bold border-b border-purple-800/60 pb-2">
                <span>SOUND AMPLIFIERS</span>
                {/* Dedicated Close Button */}
                <button
                  type="button"
                  onClick={() => setShowAmpControls(false)}
                  className="text-[10px] text-purple-300 hover:text-white border border-purple-700 hover:border-amber-400 px-2 py-0.5 bg-purple-950/80 transition-colors"
                >
                  [X] CLOSE
                </button>
              </div>

              {/* Presets Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-purple-300/80 uppercase tracking-wider">
                  Select Amplifier Mode:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmplifierMode("standard")}
                    className={`py-1.5 text-[10px] border font-bold uppercase transition-all ${
                      amplifierMode === "standard"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-purple-800 bg-purple-950/50 text-purple-300 hover:border-purple-500"
                    }`}
                  >
                    Standard
                  </button>

                  <button
                    type="button"
                    onClick={() => setAmplifierMode("crazy-boom")}
                    className={`py-1.5 text-[10px] border font-bold uppercase transition-all ${
                      amplifierMode === "crazy-boom"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-purple-800 bg-purple-950/50 text-purple-300 hover:border-purple-500"
                    }`}
                  >
                    Crazy Boom
                  </button>

                  <button
                    type="button"
                    onClick={() => setAmplifierMode("havy-bass")}
                    className={`py-1.5 text-[10px] border font-bold uppercase transition-all ${
                      amplifierMode === "havy-bass"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-purple-800 bg-purple-950/50 text-purple-300 hover:border-purple-500"
                    }`}
                  >
                    HavyBass
                  </button>

                  <button
                    type="button"
                    onClick={() => setAmplifierMode("4k")}
                    className={`py-1.5 text-[10px] border font-bold uppercase transition-all ${
                      amplifierMode === "4k"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-purple-800 bg-purple-950/50 text-purple-300 hover:border-purple-500"
                    }`}
                  >
                    4K Theater
                  </button>
                </div>
              </div>

              {/* Volume Gain Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span>VOLUME GAIN:</span>
                  <span>{gainPercentage}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={gain}
                  onChange={(e) => setGain(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-purple-950"
                />
              </div>

              {/* Manual Bass Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>MANUAL BASS BOOST:</span>
                  <span>
                    {amplifierMode === "standard"
                      ? `+${bassBoost} dB`
                      : `AUTO (${getAmplifierBadgeLabel()})`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  disabled={amplifierMode !== "standard"}
                  value={bassBoost}
                  onChange={(e) => setBassBoost(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-purple-950 disabled:opacity-40"
                />
              </div>
            </div>
          )}

          {/* Main Player Container */}
          <div className="w-full max-w-sm bg-[#161224] border-2 border-[#2b2247] p-6 shadow-2xl flex flex-col items-center gap-5">
            {/* Album Artwork */}
            <div className="w-full aspect-square bg-[#0b0814] border-2 border-[#2b2247] p-2 flex items-center justify-center overflow-hidden relative shadow-inner">
              {currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover pixelated select-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-purple-400/60 gap-2">
                  <span className="material-symbols-outlined text-6xl">
                    graphic_eq
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest">
                    NO ARTWORK
                  </span>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="text-center space-y-1 w-full px-2">
              <h2 className="font-mono font-bold text-2xl text-purple-100 tracking-wide truncate">
                {currentTrack.title}
              </h2>
              <p className="font-mono text-sm text-purple-300/80 truncate">
                {currentTrack.artist}
                {currentTrack.albumName ? ` — ${currentTrack.albumName}` : ""}
              </p>
            </div>

            {/* Audio Badges */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-3 py-1 bg-[#130f1f] border border-[#3b2f5d] text-purple-300 tracking-wider">
                44.1 kHz
              </span>
              <span
                className={`px-3 py-1 border tracking-wider transition-colors ${
                  amplifierMode !== "standard"
                    ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold"
                    : "bg-[#130f1f] border-[#3b2f5d] text-purple-300"
                }`}
              >
                {getAmplifierBadgeLabel()}
              </span>
            </div>

            {/* Scrubber */}
            <div className="w-full space-y-2">
              <div className="flex justify-between font-mono text-xs text-purple-300/90 tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="relative w-full h-5 bg-[#0b0814] border border-[#2b2247] p-1 flex items-center gap-[2px]">
                {Array.from({ length: totalSegments }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-full transition-all duration-75 ${
                      idx < activeSegments
                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                        : "bg-[#181328]"
                    }`}
                  />
                ))}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between w-full pt-2 px-1">
              <button
                type="button"
                onClick={() => setIsShuffle((p) => !p)}
                className={`w-11 h-11 flex items-center justify-center border-2 transition-colors ${
                  isShuffle
                    ? "border-amber-400 bg-amber-400/20 text-amber-300"
                    : "border-[#31274e] bg-[#1d172e] text-purple-300"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  shuffle
                </span>
              </button>

              <button
                type="button"
                onClick={previousTrack}
                className="w-12 h-12 flex items-center justify-center border-2 border-[#31274e] bg-[#1d172e] text-purple-200"
              >
                <span className="material-symbols-outlined text-2xl">
                  skip_previous
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="w-20 h-20 flex items-center justify-center border-4 border-[#523d83] bg-[#7352b2] text-white shadow-lg"
              >
                <span className="material-symbols-outlined text-4xl">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="w-12 h-12 flex items-center justify-center border-2 border-[#31274e] bg-[#1d172e] text-purple-200"
              >
                <span className="material-symbols-outlined text-2xl">
                  skip_next
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsRepeat((p) => !p)}
                className={`w-11 h-11 flex items-center justify-center border-2 transition-colors ${
                  isRepeat
                    ? "border-amber-400 bg-amber-400/20 text-amber-300"
                    : "border-[#31274e] bg-[#1d172e] text-purple-300"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  repeat
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            2. MINIMIZED FLOATING BAR
           ========================================================================= */
        <div
          className={`fixed bottom-16 sm:bottom-20 left-0 right-0 z-[9000] px-3 transition-all duration-500 transform ${
            isIdleHidden
              ? "translate-y-24 opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100 pointer-events-auto"
          }`}
        >
          <div className="bg-[#161224]/95 backdrop-blur-md border-2 border-[#31274e] p-2.5 flex items-center justify-between gap-3 max-w-lg mx-auto shadow-2xl rounded-md">
            <div
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-[#0b0814] border border-[#31274e] flex-shrink-0 overflow-hidden relative rounded-sm">
                {currentTrack.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover pixelated"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-400">
                    <span className="material-symbols-outlined text-xl">
                      music_note
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-purple-100 font-bold truncate group-hover:text-amber-300 transition-colors uppercase">
                  {currentTrack.title}
                </p>
                <p className="font-mono text-[10px] text-purple-300/70 truncate uppercase">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={previousTrack}
                className="w-8 h-8 flex items-center justify-center border border-[#31274e] bg-[#1d172e] text-purple-200 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">
                  skip_previous
                </span>
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="w-9 h-9 flex items-center justify-center border-2 border-[#523d83] bg-[#7352b2] text-white active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="w-8 h-8 flex items-center justify-center border border-[#31274e] bg-[#1d172e] text-purple-200 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">
                  skip_next
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-8 h-8 flex items-center justify-center text-purple-300 hover:text-white"
                title="Expand Full Deck"
              >
                <span className="material-symbols-outlined text-xl">
                  open_in_full
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
