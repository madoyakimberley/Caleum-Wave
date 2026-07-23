"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

export type ActivityType =
  | "INSTALL_SONG"
  | "CREATE_ALBUM"
  | "DELETE_SONG"
  | "DELETE_ALBUM"
  | "UPDATE_ALBUM"
  | "SELECT_ALBUM";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  timestamp: number;
  details: {
    title: string;
    artist?: string;
    img?: string;
    albumId?: string;
  };
}

interface ActivityContextType {
  activities: ActivityLog[];
  addActivity: (type: ActivityType, details: ActivityLog["details"]) => void;
  hasRecentActivity: boolean;
  recentPlayed: ActivityLog[];
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined,
);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on initial mount
  useEffect(() => {
    const saved = localStorage.getItem("caelum_activity_log");
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse activity log", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Sync to localStorage whenever activities change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("caelum_activity_log", JSON.stringify(activities));
    }
  }, [activities, isLoaded]);

  // Add a new event to RAM state instantly
  const addActivity = (type: ActivityType, details: ActivityLog["details"]) => {
    const newLog: ActivityLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      timestamp: Date.now(),
      details,
    };
    setActivities((prev) => [newLog, ...prev]);
  };

  // 🧠 useMemo Computation Lock:
  // Evaluates boolean status & recent played items only when `activities` changes.
  const hasRecentActivity = useMemo(() => {
    return activities.length > 0;
  }, [activities]);

  const recentPlayed = useMemo(() => {
    // Filter activities that represent playable songs/albums and take top 5 unique
    return activities
      .filter((a) => a.type === "INSTALL_SONG" || a.type === "SELECT_ALBUM")
      .slice(0, 5);
  }, [activities]);

  return (
    <ActivityContext.Provider
      value={{ activities, addActivity, hasRecentActivity, recentPlayed }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
