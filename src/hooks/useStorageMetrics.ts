"use client";

import { useState, useEffect } from "react";

const DB_NAME = "CaelumWaveDB";
const STORE_NAME = "audio_blobs";

export interface StorageMetrics {
  bytesUsed: number;
  formattedSize: string;
  trackCount: number;
  isLoading: boolean;
}

export function useStorageMetrics() {
  const [metrics, setMetrics] = useState<StorageMetrics>({
    bytesUsed: 0,
    formattedSize: "0.0 MB",
    trackCount: 0,
    isLoading: true,
  });

  const calculateStorage = async () => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      setMetrics((m) => ({ ...m, isLoading: false }));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          setMetrics({
            bytesUsed: 0,
            formattedSize: "0.0 MB",
            trackCount: 0,
            isLoading: false,
          });
          return;
        }

        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const getAllReq = store.getAll();

        getAllReq.onsuccess = () => {
          const blobs: Blob[] = getAllReq.result || [];
          let totalBytes = 0;

          blobs.forEach((blob) => {
            if (blob && blob.size) {
              totalBytes += blob.size;
            }
          });

          const sizeInMB = (totalBytes / (1024 * 1024)).toFixed(1);

          setMetrics({
            bytesUsed: totalBytes,
            formattedSize: `${sizeInMB} MB`,
            trackCount: blobs.length,
            isLoading: false,
          });
        };
      };
    } catch (err) {
      console.error("Storage metric calculation error:", err);
      setMetrics((m) => ({ ...m, isLoading: false }));
    }
  };

  useEffect(() => {
    calculateStorage();
  }, []);

  return { ...metrics, refreshMetrics: calculateStorage };
}
