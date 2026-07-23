"use client";

import { useStorageMetrics } from "@/hooks/useStorageMetrics";

export default function StorageMeter() {
  const { formattedSize, trackCount, isLoading } = useStorageMetrics();

  return (
    <div className="bg-surface-container border-2 border-outline p-3 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary text-base">
          sd_card
        </span>
        <span className="uppercase text-on-surface-variant">
          STORAGE USED [INDEXEDDB SANDBOX]
        </span>
      </div>
      <div className="text-right font-bold text-primary">
        {isLoading ? (
          "CALCULATING..."
        ) : (
          <span>
            {formattedSize} ({trackCount} {trackCount === 1 ? "FILE" : "FILES"})
          </span>
        )}
      </div>
    </div>
  );
}
