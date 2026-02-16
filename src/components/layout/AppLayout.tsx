import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "@tiptap/markdown";
import type { EditorView } from "@tiptap/pm/view";
import "../editor/Editor.css";
import { DailyNote, formatDate, isToday } from "../../types/note";
import { useCurrentDate } from "../../hooks/useCurrentDate";
import { getOrCreateDailyNote, saveDailyNote, loadPastNotes } from "../../services/storage";
import { saveImage, resolveAssetUrl } from "../../services/images";
import EditableNote from "../journal/EditableNote";
import { WidgetExtension } from "../editor/extensions/widget/WidgetExtension";
import { EditorBubbleMenu } from "../editor/EditorBubbleMenu";
import { listen } from "@tauri-apps/api/event";
import { SettingsModal } from "../settings/SettingsModal";
import { LibraryDrawer } from "../library/LibraryDrawer";
import type { LibraryItem } from "../../services/library";
import { rolloverTasks } from "../../services/tasks";
import { checkForUpdate, type UpdateInfo } from "../../services/updater";
import { UpdateBanner } from "../UpdateBanner";

function insertImageViaView(file: File, view: EditorView) {
  saveImage(file).then(async (relativePath) => {
    const assetUrl = await resolveAssetUrl(relativePath);
    const node = view.state.schema.nodes.image.create({ src: assetUrl, alt: file.name });
    const tr = view.state.tr.replaceSelectionWith(node);
    view.dispatch(tr);
  }).catch((err) => {
    console.error("Failed to insert image:", err);
  });
}

function DateHeader({ date }: { date: string }) {
  const showToday = isToday(date);

  return (
    <div className="flex items-center gap-4">
      <h1
        className="text-2xl italic text-gray-900 dark:text-white"
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        {formatDate(date)}
      </h1>
      {showToday && (
        <span
          className="text-xs font-medium uppercase tracking-wide px-3 py-px rounded-full text-white font-sans"
          style={{ background: "linear-gradient(to bottom, #4b5563, #1f2937)" }}
        >
          today
        </span>
      )}
    </div>
  );
}

export default function AppLayout() {
  const today = useCurrentDate();
  const [todayNote, setTodayNote] = useState<DailyNote | null>(null);
  const [pastNotes, setPastNotes] = useState<DailyNote[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Check for app updates on mount
  useEffect(() => {
    checkForUpdate().then((info) => {
      if (info) setUpdateInfo(info);
    });
  }, []);

  // Listen for macOS menu bar events
  useEffect(() => {
    const unlistenSettings = listen("open-settings", () => setSettingsOpen(true));
    const unlistenLibrary = listen("toggle-library", () => setLibraryOpen((prev) => !prev));
    return () => {
      unlistenSettings.then((fn) => fn());
      unlistenLibrary.then((fn) => fn());
    };
  }, []);

  // Roll over unchecked tasks from past days, then load all notes
  useEffect(() => {
    async function load() {
      // Move unchecked tasks from past notes into today before loading
      await rolloverTasks(30);

      const [note, past] = await Promise.all([
        getOrCreateDailyNote(today),
        loadPastNotes(30),
      ]);
      setTodayNote(note);
      setPastNotes(past);
    }
    load();
  }, [today]);

  const handleTodaySave = useCallback(
    (note: DailyNote) => {
      saveDailyNote(note).catch(console.error);
      setTodayNote(note);
    },
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      WidgetExtension,
      Markdown,
    ],
    content: todayNote?.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-hidden px-6 text-gray-900 dark:text-gray-100",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              insertImageViaView(file, view);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            insertImageViaView(file, view);
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Backspace') {
          const { $from, empty } = view.state.selection;
          if (empty && $from.parentOffset === 0 && $from.parent.type.name === 'heading') {
            const tr = view.state.tr.setBlockType($from.before(), $from.after(), view.state.schema.nodes.paragraph);
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!todayNote) return;
      handleTodaySave({ ...todayNote, content: editor.getMarkdown() });
    },
  });

  // Sync editor content when todayNote loads from disk
  useEffect(() => {
    if (editor && todayNote) {
      const current = editor.getMarkdown();
      if (current !== todayNote.content) {
        editor.commands.setContent(todayNote.content, { contentType: 'markdown' });
      }
    }
  }, [editor, todayNote]);

  // Scroll to today on startup (after notes render)
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScrollToToday = useRef(false);

  useEffect(() => {
    if (todayNote && todayRef.current && !didScrollToToday.current) {
      didScrollToToday.current = true;
      todayRef.current.scrollIntoView({ block: "start" });
    }
  }, [todayNote]);

  // "Go to Today" badge when scrolled away
  const [todayDirection, setTodayDirection] = useState<"above" | "below" | null>(null);

  useEffect(() => {
    const todayEl = todayRef.current;
    const scrollEl = scrollRef.current;
    if (!todayEl || !scrollEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTodayDirection(null);
        } else {
          // If today's top is above the viewport, today is above → scroll up
          // If today's top is below the viewport, today is below → scroll down
          const rect = todayEl.getBoundingClientRect();
          setTodayDirection(rect.top < 0 ? "above" : "below");
        }
      },
      { root: scrollEl, threshold: 0 },
    );

    observer.observe(todayEl);
    return () => observer.disconnect();
  }, []);

  function scrollToToday() {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      ref={scrollRef}
      className="h-screen bg-white dark:bg-gray-900 overflow-y-scroll relative"
    >
      {updateInfo && (
        <UpdateBanner update={updateInfo} onDismiss={() => setUpdateInfo(null)} />
      )}
      <div className="w-full max-w-3xl">
        {/* Today */}
        <div
          ref={todayRef}
          className="min-h-[400px]"
          onClick={() => editor?.commands.focus()}
        >
          <div className="px-6 pt-6 pb-4">
            <DateHeader date={today} />
          </div>
          {editor && <EditorBubbleMenu editor={editor} />}
          <EditorContent editor={editor} />
        </div>

        {/* Past notes */}
        {pastNotes.map((note) => (
          <div key={note.date}>
            <div className="mx-6 border-t border-gray-200 dark:border-gray-700" />
            <div className="min-h-[400px]">
              <div className="px-6 pt-12 pb-4">
                <DateHeader date={note.date} />
              </div>
              <EditableNote note={note} />
            </div>
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
            ...(todayDirection === "above" ? { top: 16 } : { bottom: 16 }),
          }}
        >
          {todayDirection === "above" ? "↑" : "↓"} today
        </button>
      )}

      {/* Library drawer — triggered by macOS menu bar Cmd+J */}
      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onInsert={(item: LibraryItem) => {
          if (!editor) return;
          editor.chain().focus().insertContent({
            type: 'widget',
            attrs: {
              id: crypto.randomUUID(),
              spec: item.html,
              prompt: item.prompt,
              saved: true,
              loading: false,
              error: '',
            },
          }).run();
          setLibraryOpen(false);
        }}
      />

      {/* Settings modal — triggered by macOS menu bar Cmd+, */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
