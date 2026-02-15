import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import "../editor/Editor.css";
import { DailyNote, formatDate, isToday, getToday, getDaysFromNow } from "../../types/note";
import { getOrCreateDailyNote, saveDailyNote, loadPastNotes, loadDailyNote } from "../../services/storage";
import PastNote from "../journal/PastNote";
import EditableNote from "../journal/EditableNote";

function DateHeader({ date }: { date: string }) {
  const showToday = isToday(date);
  const showTomorrow = isTomorrow(date);

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
      {showTomorrow && (
        <span
          className="text-xs font-medium uppercase tracking-wide px-3 py-px rounded-full text-white font-sans"
          style={{ background: "linear-gradient(to bottom, #6366f1, #4338ca)" }}
        >
          tomorrow
        </span>
      )}
    </div>
  );
}

function isTomorrow(dateStr: string): boolean {
  return dateStr === getDaysFromNow(1);
}

export default function AppLayout() {
  const today = getToday();
  const tomorrow = getDaysFromNow(1);
  const [tomorrowNote, setTomorrowNote] = useState<DailyNote | null>(null);
  const [todayNote, setTodayNote] = useState<DailyNote | null>(null);
  const [pastNotes, setPastNotes] = useState<DailyNote[]>([]);

  // Load tomorrow (if exists), today, and past notes on mount
  useEffect(() => {
    async function load() {
      const [tmrw, note, past] = await Promise.all([
        loadDailyNote(tomorrow),
        getOrCreateDailyNote(today),
        loadPastNotes(30),
      ]);
      setTomorrowNote(tmrw);
      setTodayNote(note);
      setPastNotes(past);
    }
    load();
  }, [today, tomorrow]);

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
      Markdown,
    ],
    content: todayNote?.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-hidden px-16 text-gray-900 dark:text-gray-100",
      },
    },
    onUpdate: ({ editor }) => {
      if (!todayNote) return;
      handleTodaySave({ ...todayNote, content: editor.getJSON() });
    },
  });

  // Sync editor content when todayNote loads from disk
  useEffect(() => {
    if (editor && todayNote) {
      const current = JSON.stringify(editor.getJSON());
      if (current !== JSON.stringify(todayNote.content)) {
        editor.commands.setContent(todayNote.content);
      }
    }
  }, [editor, todayNote]);

  return (
    <div
      className="h-screen bg-white dark:bg-gray-900 overflow-y-auto"
      onClick={() => editor?.commands.focus()}
    >
      <div className="w-full max-w-3xl mx-auto">
        {/* Tomorrow (only if note exists) */}
        {tomorrowNote && (
          <div className="mt-12">
            <div className="px-16 pt-12 pb-4">
              <DateHeader date={tomorrow} />
            </div>
            <EditableNote note={tomorrowNote} />
          </div>
        )}

        {/* Today */}
        <div className={`min-h-screen ${tomorrowNote ? "mt-12" : ""}`}>
          <div className="px-16 pt-12 pb-4">
            <DateHeader date={today} />
          </div>
          <EditorContent editor={editor} />
        </div>

        {/* Past notes */}
        {pastNotes.map((note) => (
          <div key={note.date}>
            <div className="mx-16 border-t border-gray-200 dark:border-gray-700" />
            <div className="min-h-screen">
              <div className="px-16 pt-12 pb-4">
                <DateHeader date={note.date} />
              </div>
              <PastNote note={note} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
