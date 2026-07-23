"use client";

export interface ThemePreset {
  id: string;
  name: string;
  gradient: string;
  image: string;
}

export const PRESET_THEMES: ThemePreset[] = [
  {
    id: "neon_drift",
    name: "NEON DRIFT",
    gradient: "linear-gradient(135deg, #ff007f 0%, #00f0ff 100%)",
    image: "/images/neon-drift.png",
  },
  {
    id: "amber_gear",
    name: "AMBER GEAR",
    gradient: "linear-gradient(135deg, #ff9900 0%, #331a00 100%)",
    image: "/images/amber-gear.png",
  },
  {
    id: "crimson_circuit",
    name: "CRIMSON CIRCUIT",
    gradient: "linear-gradient(135deg, #e60000 0%, #1a0000 100%)",
    image: "/images/crimson-circuit.png",
  },
  {
    id: "emerald_glitch",
    name: "EMERALD GLITCH",
    gradient: "linear-gradient(135deg, #00ff66 0%, #003311 100%)",
    image: "/images/emerald-glitch.png",
  },
  {
    id: "frozen_signal",
    name: "FROZEN SIGNAL",
    gradient: "linear-gradient(135deg, #00d2ff 0%, #001f3f 100%)",
    image: "/images/frozen-signal.png",
  },
  {
    id: "mauve_memory",
    name: "MAUVE MEMORY",
    gradient: "linear-gradient(135deg, #e0b0ff 0%, #2b003b 100%)",
    image: "/images/mauve-memory.png",
  },
  {
    id: "solar_grid",
    name: "SOLAR GRID",
    gradient: "linear-gradient(135deg, #ffcc00 0%, #ff3300 100%)",
    image: "/images/solar-grid.png",
  },
  {
    id: "ghost_protocol",
    name: "GHOST PROTOCOL",
    gradient: "linear-gradient(135deg, #888888 0%, #111111 100%)",
    image: "/images/ghost.png",
  },
];

interface ThemePickerProps {
  selectedTheme: string;
  onSelectTheme: (theme: ThemePreset) => void;
}

export default function ThemePicker({
  selectedTheme,
  onSelectTheme,
}: ThemePickerProps) {
  return (
    <div className="space-y-2">
      <label className="font-label-sm text-outline block uppercase tracking-wide">
        SELECT CONTAINER THEME MATRIX & ARTWORK
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {PRESET_THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.gradient;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme)}
              className={`h-16 border-4 transition-all active-press relative overflow-hidden group ${
                isSelected
                  ? "border-primary scale-105 z-10 retro-shadow"
                  : "border-outline-variant hover:border-outline opacity-80 hover:opacity-100"
              }`}
              style={{ background: theme.gradient }}
              title={theme.name}
            >
              {/* Image Preview Overlay */}
              <div className="absolute inset-0 opacity-50 group-hover:opacity-80 transition-opacity">
                <img
                  src={theme.image}
                  alt={theme.name}
                  className="w-full h-full object-cover pixelated"
                />
              </div>

              {isSelected && (
                <span className="material-symbols-outlined text-sm text-primary absolute inset-0 flex items-center justify-center bg-surface-container-lowest/70 font-bold z-20">
                  check
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
