import { useEffect, useRef, } from "react";
import type { AssistantScope, } from "../../services/assistant";

interface AiComposerProps {
  open: boolean;
  prompt: string;
  scope: AssistantScope;
  hasAiConfigured: boolean;
  isSubmitting: boolean;
  error: string | null;
  summary: string | null;
  onPromptChange: (value: string,) => void;
  onScopeChange: (scope: AssistantScope,) => void;
  onClose: () => void;
  onSubmit: () => void;
  onOpenSettings: () => void;
}

export function AiComposer({
  open,
  prompt,
  scope,
  hasAiConfigured,
  isSubmitting,
  error,
  summary,
  onPromptChange,
  onScopeChange,
  onClose,
  onSubmit,
  onOpenSettings,
}: AiComposerProps,) {
  const inputRef = useRef<HTMLTextAreaElement>(null,);

  useEffect(() => {
    if (!open || !hasAiConfigured) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0,);
    return () => window.clearTimeout(timer,);
  }, [hasAiConfigured, open,],);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] transition-transform duration-300 ease-out"
      style={{ transform: open ? "translateY(0)" : "translateY(100%)", }}
    >
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-4">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white/95 shadow-[0_-20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.24em] text-gray-400"
                style={{ fontFamily: "'IBM Plex Mono', monospace", }}
              >
                AI Command
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Ask Philo to organize notes or create tasks.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-gray-400 transition-colors hover:text-gray-600"
              style={{ fontFamily: "'IBM Plex Mono', monospace", }}
            >
              esc
            </button>
          </div>

          {!hasAiConfigured
            ? (
              <div className="space-y-4 px-5 py-5">
                <p className="text-sm leading-6 text-gray-600">
                  AI isn&apos;t configured yet. Add your Anthropic API key to start using note commands.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", }}
                >
                  Click to configure AI
                </button>
              </div>
            )
            : (
              <div className="space-y-4 px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onScopeChange("today",)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      scope === "today"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => onScopeChange("recent",)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      scope === "recent"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", }}
                  >
                    Across notes
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(event,) => onPromptChange(event.target.value,)}
                  onKeyDown={(event,) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder="Create tasks from this note, clean up today's note, or organize related notes..."
                  className="min-h-28 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-hidden transition-colors placeholder:text-gray-400 focus:border-gray-400"
                />

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p
                      className="text-[11px] uppercase tracking-[0.2em] text-gray-400"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", }}
                    >
                      {scope === "today" ? "Editing today only" : "Editing recent notes when needed"}
                    </p>
                    {summary && <p className="text-sm text-emerald-700">{summary}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>
                  <button
                    onClick={onSubmit}
                    disabled={isSubmitting || !prompt.trim()}
                    className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", }}
                  >
                    {isSubmitting ? "Running..." : "Run ⌘↵"}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
