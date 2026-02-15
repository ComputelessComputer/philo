import { useEffect, useState, useRef } from 'react';
import type { LibraryItem } from '../../services/library';
import { loadLibrary, removeFromLibrary } from '../../services/library';

interface LibraryDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (item: LibraryItem) => void;
}

export function LibraryDrawer({ open, onClose, onInsert }: LibraryDrawerProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadLibrary().then(setItems);
    }
  }, [open]);

  const handleRemove = async (id: string) => {
    await removeFromLibrary(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] transition-transform duration-300 ease-out"
      style={{ transform: open ? 'translateY(0)' : 'translateY(100%)' }}
    >
      {/* Backdrop — click to close */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2
              className="text-sm font-medium text-gray-900"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Library
            </h2>
            <span className="text-xs text-gray-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {items.length} {items.length === 1 ? 'widget' : 'widgets'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xs cursor-pointer"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            esc
          </button>
        </div>

        {/* Cards row */}
        <div
          ref={scrollRef}
          className="flex gap-3 px-6 py-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.length === 0 ? (
            <div
              className="flex items-center justify-center w-full py-8 text-sm text-gray-400"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              No saved widgets yet. Build one and click "Save to Library".
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-56 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onInsert(item)}
              >
                <div className="p-4">
                  <h3
                    className="text-sm font-medium text-gray-900 truncate"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-1 text-xs text-gray-500 line-clamp-2"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
                  <span
                    className="text-[10px] text-gray-300"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {new Date(item.savedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.id);
                    }}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
