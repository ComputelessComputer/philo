import { useState, useEffect, useRef } from 'react';
import { loadSettings, setApiKey } from '../../services/settings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadSettings().then((s) => {
        setApiKeyState(s.anthropicApiKey);
        setSaved(false);
      });
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    await setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
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
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg font-medium text-gray-900"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label
            className="block text-sm text-gray-600"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Anthropic API Key
          </label>
          <input
            ref={inputRef}
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKeyState(e.target.value);
              setSaved(false);
            }}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <p className="text-xs text-gray-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Required for the Build feature. Stored locally on your device.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg transition-colors cursor-pointer"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white rounded-lg transition-all cursor-pointer"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              background: saved
                ? 'linear-gradient(to bottom, #22c55e, #16a34a)'
                : 'linear-gradient(to bottom, #7c3aed, #5b21b6)',
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
