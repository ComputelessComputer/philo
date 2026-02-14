import { JSONContent } from '@tiptap/react';

export interface Task {
  id: string;
  text: string;
  checked: boolean;
  originDate: string; // ISO date string (YYYY-MM-DD)
}

export interface DailyNote {
  date: string; // ISO date string (YYYY-MM-DD)
  content: JSONContent; // TipTap JSON document
  tasks: Task[];
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
