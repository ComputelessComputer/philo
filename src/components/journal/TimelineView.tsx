import { useState, useEffect } from 'react';
import DailyNote from './DailyNote';
import { DailyNote as DailyNoteType, getToday, getDaysAgo, getDaysFromNow } from '../../types/note';
import { getOrCreateDailyNote } from '../../services/storage';
import { checkAndRunRollover } from '../../services/tasks';

export default function TimelineView() {
  const [notes, setNotes] = useState<DailyNoteType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialNotes();
  }, []);

  async function loadInitialNotes() {
    setLoading(true);
    try {
      const today = getToday();
      
      // Run task rollover first
      await checkAndRunRollover(today);
      
      // Load tomorrow + today + past 7 days
      const tomorrow = getDaysFromNow(1);
      const dates = [tomorrow, today];
      for (let i = 1; i <= 7; i++) {
        dates.push(getDaysAgo(i));
      }

      const loadedNotes = await Promise.all(
        dates.map(date => getOrCreateDailyNote(date))
      );

      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNoteUpdate(updatedNote: DailyNoteType) {
    setNotes(prev =>
      prev.map(note =>
        note.date === updatedNote.date ? updatedNote : note
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      {notes.map(note => (
        <DailyNote
          key={note.date}
          note={note}
          onUpdate={handleNoteUpdate}
        />
      ))}
    </div>
  );
}
