import { open as openDialog, } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState, } from "react";
import { applyFilenamePattern, getJournalDir, resetJournalDir, } from "../../services/paths";
import { DEFAULT_FILENAME_PATTERN, loadSettings, saveSettings, type Settings, } from "../../services/settings";
import { getToday, } from "../../types/note";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const FILENAME_PRESETS = [
  { label: "Flat", value: "{YYYY}-{MM}-{DD}", },
  { label: "By year", value: "{YYYY}/{YYYY}-{MM}-{DD}", },
  { label: "By year + month", value: "{YYYY}/{MM}/{YYYY}-{MM}-{DD}", },
];

const mono = { fontFamily: "'IBM Plex Mono', monospace", };

export function SettingsModal({ open, onClose, }: SettingsModalProps,) {
  const [settings, setSettings,] = useState<Settings | null>(null,);
  const [saved, setSaved,] = useState(false,);
  const [defaultJournalDir, setDefaultJournalDir,] = useState("",);
  const inputRef = useRef<HTMLInputElement>(null,);

  useEffect(() => {
    if (open) {
      loadSettings().then((s,) => {
        setSettings(s,);
        setSaved(false,);
      },);
      // Resolve the default journal dir for display
      getJournalDir().then(setDefaultJournalDir,);
      setTimeout(() => inputRef.current?.focus(), 100,);
    }
  }, [open,],);

  if (!open || !settings) return null;

  const effectivePattern = settings.filenamePattern || DEFAULT_FILENAME_PATTERN;
  const filenamePreview = applyFilenamePattern(effectivePattern, getToday(),) + ".md";

  const update = (partial: Partial<Settings>,) => {
    setSettings({ ...settings, ...partial, },);
    setSaved(false,);
  };

  const handleSave = async () => {
    try {
      await saveSettings(settings,);
      // Reset cached journal dir so it picks up the new setting
      await resetJournalDir(settings.journalDir || undefined,);
      setSaved(true,);
      setTimeout(() => setSaved(false,), 2000,);
    } catch (err) {
      console.error("Failed to save settings:", err,);
    }
  };

  const handleChooseFolder = async () => {
    const selected = await openDialog({ directory: true, multiple: false, },);
    if (selected) {
      update({ journalDir: selected, },);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent,) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && e.metaKey) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e,) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-900" style={mono}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* API Key */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-600" style={mono}>
            Anthropic API Key
          </label>
          <input
            ref={inputRef}
            type="password"
            value={settings.anthropicApiKey}
            onChange={(e,) => update({ anthropicApiKey: e.target.value, },)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            style={mono}
          />
          <p className="text-xs text-gray-400" style={mono}>
            Required for the Build feature. Stored locally on your device.
          </p>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-gray-100" />

        {/* Journal Location */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-600" style={mono}>
            Journal Location
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 truncate bg-gray-50"
              style={mono}
              title={settings.journalDir || defaultJournalDir}
            >
              {settings.journalDir || defaultJournalDir || "..."}
            </div>
            <button
              onClick={handleChooseFolder}
              className="shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-gray-700"
              style={mono}
            >
              Choose…
            </button>
          </div>
          {settings.journalDir && (
            <button
              onClick={() => update({ journalDir: "", },)}
              className="text-xs text-violet-600 hover:text-violet-800 transition-colors cursor-pointer"
              style={mono}
            >
              Reset to default
            </button>
          )}
          <p className="text-xs text-gray-400" style={mono}>
            Where daily notes are stored. Use a synced folder (iCloud, Dropbox) to access notes across devices.
          </p>
          <p className="text-xs text-amber-600" style={mono}>
            Changing this will not move existing files.
          </p>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-gray-100" />

        {/* Filename Pattern */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-600" style={mono}>
            Filename Pattern
          </label>
          <input
            type="text"
            value={settings.filenamePattern}
            onChange={(e,) => update({ filenamePattern: e.target.value, },)}
            placeholder={DEFAULT_FILENAME_PATTERN}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            style={mono}
          />
          <div className="flex flex-wrap gap-1.5">
            {FILENAME_PRESETS.map((preset,) => (
              <button
                key={preset.value}
                onClick={() => update({ filenamePattern: preset.value, },)}
                className={`px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                  effectivePattern === preset.value
                    ? "border-violet-400 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
                style={mono}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400" style={mono}>
            Preview: <span className="text-gray-600">{filenamePreview}</span>
          </p>
          <p className="text-xs text-gray-400" style={mono}>
            Tokens: {"{"}
            <span className="text-gray-600">YYYY</span>
            {"}"}, {"{"}
            <span className="text-gray-600">MM</span>
            {"}"}, {"{"}
            <span className="text-gray-600">DD</span>
            {"}"}. Use <span className="text-gray-600">/</span> for subdirectories.
          </p>
          <p className="text-xs text-amber-600" style={mono}>
            Changing this will not rename existing files.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg transition-colors cursor-pointer"
            style={mono}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white rounded-lg transition-all cursor-pointer"
            style={{
              ...mono,
              background: saved
                ? "linear-gradient(to bottom, #22c55e, #16a34a)"
                : "linear-gradient(to bottom, #7c3aed, #5b21b6)",
            }}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
