import { useState, useEffect } from 'react';
import { getToday } from '../types/note';

/**
 * Returns today's date string (YYYY-MM-DD), reactively updated when:
 * - The clock crosses midnight (scheduled timeout)
 * - The window regains focus (e.g. user switches back to app)
 * - The document becomes visible (e.g. computer wakes from sleep)
 *
 * Components that depend on "today" will re-render automatically on day change.
 */
export function useCurrentDate(): string {
  const [date, setDate] = useState(getToday);

  useEffect(() => {
    function check() {
      const now = getToday();
      setDate((prev) => (prev !== now ? now : prev));
    }

    // Schedule a timeout for just past midnight
    function scheduleNextMidnight(): ReturnType<typeof setTimeout> {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const ms = tomorrow.getTime() - now.getTime() + 100; // +100ms buffer

      return setTimeout(() => {
        check();
      }, ms);
    }

    const timeoutId = scheduleNextMidnight();

    // Catch sleep/wake: the browser fires visibilitychange when the window
    // becomes visible again after the computer was asleep.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        check();
      }
    }

    // Catch alt-tab / window switch back
    function onFocus() {
      check();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [date]); // re-schedule midnight timeout when date changes

  return date;
}
