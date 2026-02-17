import { useState, } from "react";
import type { UpdateInfo, } from "../services/updater";

interface UpdateBannerProps {
  update: UpdateInfo;
  onDismiss: () => void;
}

export function UpdateBanner({ update, onDismiss, }: UpdateBannerProps,) {
  const [updating, setUpdating,] = useState(false,);
  const [progress, setProgress,] = useState<number | null>(null,);

  const handleUpdate = async () => {
    setUpdating(true,);
    try {
      await update.downloadAndInstall((downloaded, total,) => {
        if (total > 0) setProgress(Math.round((downloaded / total) * 100,),);
      },);
    } catch (err) {
      console.error("Update failed:", err,);
      setUpdating(false,);
      setProgress(null,);
    }
  };

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80"
      style={{ fontFamily: "'IBM Plex Mono', monospace", }}
    >
      <span className="text-xs text-gray-600 dark:text-gray-300">
        v{update.version} available
      </span>

      <button
        onClick={handleUpdate}
        disabled={updating}
        className="text-xs px-2.5 py-0.5 rounded-md text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-default"
        style={{
          background: updating
            ? "linear-gradient(to bottom, #9ca3af, #6b7280)"
            : "linear-gradient(to bottom, #4b5563, #1f2937)",
        }}
      >
        {updating
          ? progress !== null
            ? `Downloading\u2026 ${progress}%`
            : "Preparing\u2026"
          : "Update & Restart"}
      </button>

      {!updating && (
        <button
          onClick={onDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
