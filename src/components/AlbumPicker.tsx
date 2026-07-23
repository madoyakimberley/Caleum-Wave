"use client";

import React from "react";
import ThemePicker, { ThemePreset } from "./ThemePicker";

export interface AlbumContainer {
  id: string;
  name: string;
  theme?: string;
  image?: string;
}

interface AlbumPickerProps {
  albums: AlbumContainer[];
  selectedAlbumId: string;
  onSelectAlbumId: (id: string) => void;
  createNewAlbum: boolean;
  setCreateNewAlbum: (val: boolean) => void;
  newAlbumName: string;
  setNewAlbumName: (val: string) => void;
  selectedTheme?: string;
  setSelectedTheme?: (val: string) => void;
  selectedThemeImage?: string;
  setSelectedThemeImage?: (val: string) => void;
}

export default function AlbumPicker({
  albums,
  selectedAlbumId,
  onSelectAlbumId,
  createNewAlbum,
  setCreateNewAlbum,
  newAlbumName,
  setNewAlbumName,
  // 1. Destructured the theme props!
  selectedTheme,
  setSelectedTheme,
  selectedThemeImage,
  setSelectedThemeImage,
}: AlbumPickerProps) {
  // 2. Handler to apply both gradient AND image to state when a preset is picked
  const handleThemeSelect = (theme: ThemePreset) => {
    if (setSelectedTheme) {
      setSelectedTheme(theme.gradient);
    }
    if (setSelectedThemeImage) {
      setSelectedThemeImage(theme.image);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="font-label-sm text-outline uppercase block">
          TARGET ALBUM CONTAINER
        </label>
        <button
          type="button"
          onClick={() => setCreateNewAlbum(!createNewAlbum)}
          className="text-label-sm font-label-sm text-secondary hover:underline uppercase"
        >
          {createNewAlbum ? "← CHOOSE EXISTING ALBUM" : "+ CREATE NEW ALBUM"}
        </button>
      </div>

      {!createNewAlbum ? (
        <div>
          {albums.length > 0 ? (
            <select
              value={selectedAlbumId}
              onChange={(e) => onSelectAlbumId(e.target.value)}
              className="w-full p-3 bg-surface-container-lowest border-4 border-outline-variant text-on-surface font-label-lg uppercase focus:outline-none focus:border-secondary transition-colors"
            >
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="font-label-sm text-on-surface-variant italic">
              No albums found. Create a new album below.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="font-label-sm text-outline block mb-1 uppercase">
            NEW ALBUM NAME
          </label>
          <input
            type="text"
            placeholder="ENTER ALBUM NAME..."
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            className="w-full p-3 bg-surface-container-lowest border-4 border-outline-variant text-primary font-label-lg uppercase focus:outline-none focus:border-secondary transition-colors"
          />
        </div>
      )}

      {/* 3. Render ThemePicker inside AlbumPicker so themes can be chosen */}
      {setSelectedTheme && (
        <ThemePicker
          selectedTheme={selectedTheme || ""}
          onSelectTheme={handleThemeSelect}
        />
      )}
    </div>
  );
}
