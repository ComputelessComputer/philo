import { invoke, } from "@tauri-apps/api/core";
import { listen, } from "@tauri-apps/api/event";
import { getCurrentWindow, } from "@tauri-apps/api/window";
import { watch, } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { useCurrentDate, } from "../../hooks/useCurrentDate";
import { useTimezoneCity, } from "../../hooks/useTimezoneCity";
import type { LibraryItem, } from "../../services/library";
import { getJournalDir, initJournalScope, } from "../../services/paths";
import { loadSettings, } from "../../services/settings";
import { getOrCreateDailyNote, loadDailyNote, saveDailyNote, } from "../../services/storage";
import { rolloverTasks, } from "../../services/tasks";
import { checkForUpdate, type UpdateInfo, } from "../../services/updater";
import { DailyNote, formatDate, getDaysAgo, isToday, } from "../../types/note";
import EditableNote, { type EditableNoteHandle, } from "../journal/EditableNote";
import { LibraryDrawer, } from "../library/LibraryDrawer";
import { OnboardingModal, } from "../onboarding/OnboardingModal";
import { SettingsModal, } from "../settings/SettingsModal";
import { UpdateBanner, } from "../UpdateBanner";

function applyCity(savedCity: string | null | undefined, newCity: string,): string {
  if (!savedCity || savedCity === newCity) return newCity;
  const from = savedCity.includes(" → ",) ? savedCity.split(" → ",)[0] : savedCity;
  return `${from} → ${newCity}`;
}

function noteChanged(current: DailyNote | null, incoming: DailyNote,): boolean {
  if (!current) return true;
  return current.content !== incoming.content || current.city !== incoming.city;
}

function DateHeader({ date, city, }: { date: string; city?: string | null; },) {
  const showToday = isToday(date,);

  return (
    <div className="flex items-center gap-4">
      <h1
        className="text-2xl italic text-gray-900 dark:text-white"
        style={{ fontFamily: '"Instrument Serif", serif', }}
      >
        {formatDate(date,)}
      </h1>
      {showToday && (
        <span
          className="text-xs font-medium uppercase tracking-wide px-3 py-px rounded-full text-white font-sans"
          style={{ background: "linear-gradient(to bottom, #4b5563, #1f2937)", }}
        >
          today
        </span>
      )}
      {city && (
        <span className="text-sm text-gray-400 dark:text-gray-500 font-sans">
          {city}
        </span>
      )}
    </div>
  );
}

function LazyNote({ date, }: { date: string; },) {
  const [note, setNote,] = useState<DailyNote | null>(null,);
  const containerRef = useRef<HTMLDivElement>(null,);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry,],) => {
        if (entry.isIntersecting) {
          loadDailyNote(date,).then(setNote,).catch(console.error,);
        }
      },
      { rootMargin: "400px", },
    );

    observer.observe(el,);
    return () => observer.disconnect();
  }, [date,],);

  return (
    <div ref={containerRef} className="min-h-[400px]">
      {note && (
        <>
          <div className="px-6 pt-12 pb-4">
            <DateHeader date={note.date} city={note.city} />
          </div>
          <EditableNote note={note} />
        </>
      )}
    </div>
  );
}

export default function AppLayout() {
  const today = useCurrentDate();
  const currentCity = useTimezoneCity();
  const [todayNote, setTodayNote,] = useState<DailyNote | null>(null,);
  const pastDates = useMemo(() => Array.from({ length: 30, }, (_, i,) => getDaysAgo(i + 1,),), [today,],);
  const [settingsOpen, setSettingsOpen,] = useState(false,);
  const [libraryOpen, setLibraryOpen,] = useState(false,);
  const [onboardingOpen, setOnboardingOpen,] = useState(false,);
  const [isConfigured, setIsConfigured,] = useState(false,);
  const [storageRevision, setStorageRevision,] = useState(0,);
  const [updateInfo, setUpdateInfo,] = useState<UpdateInfo | null>(null,);
  const [isPinned, setIsPinned,] = useState(false,);
  const [opacity, setOpacity,] = useState(1,);
  const cityRef = useRef(currentCity,);
  const prevCityRef = useRef(currentCity,);
  const todayNoteRef = useRef<DailyNote | null>(null,);
  useEffect(() => {
    todayNoteRef.current = todayNote;
  }, [todayNote,],);

  const syncTodayNoteFromDisk = useCallback(() => {
    loadDailyNote(today,)
      .then((reloaded,) => {
        if (!reloaded) return;
        if (noteChanged(todayNoteRef.current, reloaded,)) {
          setTodayNote(reloaded,);
        }
      },)
      .catch(console.error,);
  }, [today,],);

  // Load configuration and extend FS scope on mount
  useEffect(() => {
    loadSettings()
      .then(async (settings,) => {
        const hasJournalConfig = !!settings.journalDir || !!settings.vaultDir;
        if (settings.hasCompletedOnboarding || hasJournalConfig) {
          await initJournalScope();
          setIsConfigured(true,);
        } else {
          setOnboardingOpen(true,);
        }
      },)
      .catch(console.error,);
  }, [],);

  // Check for app updates on mount
  useEffect(() => {
    checkForUpdate().then((info,) => {
      if (info) setUpdateInfo(info,);
    },);
  }, [],);

  // Listen for macOS menu bar events
  useEffect(() => {
    const unlistenSettings = listen("open-settings", () => setSettingsOpen(true,),);
    const unlistenLibrary = listen("toggle-library", () => setLibraryOpen((prev,) => !prev),);
    const unlistenUpdate = listen("update-available", () => {
      checkForUpdate().then((info,) => {
        if (info) setUpdateInfo(info,);
      },);
    },);
    return () => {
      unlistenSettings.then((fn,) => fn());
      unlistenLibrary.then((fn,) => fn());
      unlistenUpdate.then((fn,) => fn());
    };
  }, [],);

  // Re-read today's note from disk when the window regains focus (handles external edits)
  useEffect(() => {
    if (!isConfigured) return;
    const handleFocus = () => syncTodayNoteFromDisk();
    window.addEventListener("focus", handleFocus,);
    return () => window.removeEventListener("focus", handleFocus,);
  }, [isConfigured, syncTodayNoteFromDisk,],);

  // Roll over unchecked tasks from past days, then load today's note
  useEffect(() => {
    if (!isConfigured) return;
    async function load() {
      await rolloverTasks(30,);

      const note = await getOrCreateDailyNote(today,);

      // Apply current city: if the note's saved city differs, record the transition
      const effectiveCity = currentCity ? applyCity(note.city, currentCity,) : note.city;
      const todayWithCity = { ...note, city: effectiveCity, };
      cityRef.current = effectiveCity ?? currentCity ?? "";
      setTodayNote(todayWithCity,);
      if (effectiveCity !== note.city) {
        saveDailyNote(todayWithCity,).catch(console.error,);
      }
    }
    load();
  }, [isConfigured, storageRevision, today,],);

  // Detect same-day timezone change (travel): update today's note with transition city.
  // Guard (note.date === today) prevents this from running when both today and currentCity
  // change simultaneously (cross-date-line travel) — the [today] load effect handles that.
  useEffect(() => {
    if (!isConfigured) return;
    const prevCity = prevCityRef.current;
    prevCityRef.current = currentCity;
    if (prevCity === currentCity) return;

    const note = todayNoteRef.current;
    if (!note || note.date !== today) return;

    const transition = applyCity(note.city ?? prevCity, currentCity,);
    cityRef.current = transition;
    const updated = { ...note, city: transition, };
    setTodayNote(updated,);
    saveDailyNote(updated,).catch(console.error,);
  }, [currentCity, isConfigured, today,],);

  // Watch the journal directory for external changes
  useEffect(() => {
    if (!isConfigured) return;
    let unwatch: (() => void) | null = null;

    getJournalDir().then(async (dir,) => {
      unwatch = await watch(
        dir,
        (event,) => {
          if (!event.paths.some((path,) => path.endsWith(".md",))) return;
          syncTodayNoteFromDisk();
        },
        { recursive: true, },
      );
    },).catch(console.error,);

    return () => {
      unwatch?.();
    };
  }, [isConfigured, storageRevision, syncTodayNoteFromDisk,],);

  const handleTodaySave = useCallback(
    (note: DailyNote,) => {
      saveDailyNote(note,).catch(console.error,);
      setTodayNote(note,);
    },
    [],
  );

  const todayEditorRef = useRef<EditableNoteHandle>(null,);
  const todayRef = useRef<HTMLDivElement>(null,);
  const scrollRef = useRef<HTMLDivElement>(null,);

  // "Go to Today" badge when scrolled away
  const [todayDirection, setTodayDirection,] = useState<"above" | "below" | null>(null,);

  useEffect(() => {
    const todayEl = todayRef.current;
    const scrollEl = scrollRef.current;
    if (!todayEl || !scrollEl) return;

    const observer = new IntersectionObserver(
      ([entry,],) => {
        if (entry.isIntersecting) {
          setTodayDirection(null,);
        } else {
          // If today's top is above the viewport, today is above → scroll up
          // If today's top is below the viewport, today is below → scroll down
          const rect = todayEl.getBoundingClientRect();
          setTodayDirection(rect.top < 0 ? "above" : "below",);
        }
      },
      { root: scrollEl, threshold: 0, },
    );

    observer.observe(todayEl,);
    return () => observer.disconnect();
  }, [],);

  function scrollToToday() {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start", },);
  }

  return (
    <div
      ref={scrollRef}
      className="h-screen bg-white dark:bg-gray-900 overflow-y-scroll overflow-x-hidden relative"
    >
      {/* Titlebar: drag region + pin button */}
      <div
        className="sticky top-0 z-50 h-[38px] w-full flex items-center justify-end shrink-0"
        onMouseDown={(e,) => {
          if (e.buttons === 1 && !(e.target as HTMLElement).closest("button, input",)) {
            e.detail === 2
              ? getCurrentWindow().toggleMaximize()
              : getCurrentWindow().startDragging();
          }
        }}
      >
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(e,) => {
            const v = Number(e.target.value,);
            setOpacity(v,);
            invoke("set_window_opacity", { opacity: v, },);
          }}
          className="w-16 h-1 mr-1 appearance-none bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-500 [&::-webkit-slider-thumb]:dark:bg-gray-400"
          title={`Window opacity: ${Math.round(opacity * 100,)}%`}
        />
        <button
          onClick={async () => {
            const next = !isPinned;
            await getCurrentWindow().setAlwaysOnTop(next,);
            setIsPinned(next,);
          }}
          className={`mr-3 p-1 rounded-md transition-colors cursor-default ${
            isPinned
              ? "text-gray-900 dark:text-white bg-gray-200/60 dark:bg-gray-700/60"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          title={isPinned ? "Unpin window" : "Pin window on top"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={`transition-transform ${isPinned ? "" : "rotate-45"}`}
          >
            <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
          </svg>
        </button>
      </div>

      {updateInfo && <UpdateBanner update={updateInfo} onDismiss={() => setUpdateInfo(null,)} />}
      <div className="w-full max-w-3xl">
        {/* Today */}
        <div
          ref={todayRef}
          className="min-h-[400px]"
          onClick={() => todayEditorRef.current?.focus()}
        >
          <div className="px-6 pt-6 pb-4">
            <DateHeader date={today} city={currentCity} />
          </div>
          {todayNote && (
            <EditableNote
              ref={todayEditorRef}
              note={todayNote}
              onSave={handleTodaySave}
            />
          )}
        </div>

        {/* Past notes — loaded lazily as they scroll into view */}
        {pastDates.map((date,) => (
          <div key={date}>
            <div className="mx-6 border-t border-gray-200 dark:border-gray-700" />
            <LazyNote date={date} />
          </div>
        ))}
      </div>

      {/* Go to Today badge */}
      {todayDirection && (
        <button
          onClick={scrollToToday}
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide text-white font-sans shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: "linear-gradient(to bottom, #4b5563, #1f2937)",
            ...(todayDirection === "above" ? { top: 16, } : { bottom: 16, }),
          }}
        >
          {todayDirection === "above" ? "↑" : "↓"} today
        </button>
      )}

      {/* Library drawer — triggered by macOS menu bar Cmd+J */}
      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false,)}
        onInsert={(item: LibraryItem,) => {
          const editor = todayEditorRef.current?.editor;
          if (!editor) return;
          editor.chain().focus().insertContent({
            type: "widget",
            attrs: {
              id: crypto.randomUUID(),
              spec: item.html,
              prompt: item.prompt,
              saved: true,
              loading: false,
              error: "",
            },
          },).run();
          setLibraryOpen(false,);
        }}
      />

      {/* Settings modal — triggered by macOS menu bar Cmd+, */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false,)} />
      <OnboardingModal
        open={onboardingOpen}
        onComplete={() => {
          setOnboardingOpen(false,);
          setIsConfigured(true,);
          setStorageRevision((value,) => value + 1);
        }}
      />
    </div>
  );
}
