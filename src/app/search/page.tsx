"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNavbar from "@/components/BottomNavbar";
import Install from "@/components/Install";
import LocalSearch from "@/components/LocalSearch";

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<"local" | "online">("local");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen pb-28">
      {/* Universal Header */}
      <Header />

      <main className="pt-20 px-4 space-y-6 max-w-screen-md mx-auto">
        {/* Toggle Switcher */}
        <div className="grid grid-cols-2 gap-0 border-4 border-outline-variant bg-surface-container-low p-1">
          <button
            type="button"
            onClick={() => setActiveTab("local")}
            className={`font-label-lg text-label-lg py-3 px-2 border-4 transition-all pixel-press ${
              activeTab === "local"
                ? "border-primary bg-primary text-on-primary"
                : "border-transparent text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            LOCAL LIBRARY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("online")}
            className={`font-label-lg text-label-lg py-3 px-2 border-4 transition-all pixel-press ${
              activeTab === "online"
                ? "border-primary bg-primary text-on-primary"
                : "border-transparent text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            ONLINE DISCOVERY
          </button>
        </div>

        {/* Search Input */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-secondary">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "local"
                ? "Search local tracks, artists, albums..."
                : "Search global grid..."
            }
            className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-4 border-outline-variant text-on-surface font-label-lg placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary transition-colors"
          />
        </div>

        {/* Dynamic View Swapping */}
        {activeTab === "local" ? (
          <LocalSearch searchQuery={searchQuery} />
        ) : (
          <Install searchQuery={searchQuery} />
        )}
      </main>

      {/* Universal Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
}
