import { JSONContent } from '@tiptap/react';
import { DailyNote, Task, getDaysAgo } from '../types/note';
import { loadDailyNote, saveDailyNote, getOrCreateDailyNote } from './storage';
import { nanoid } from 'nanoid';

interface TaskNode {
  taskId: string;
  text: string;
  checked: boolean;
  originDate: string;
}

/**
 * Recursively extract all task items from TipTap JSON content
 */
function extractTasksFromContent(content: JSONContent, originDate: string): TaskNode[] {
  const tasks: TaskNode[] = [];

  function traverse(node: JSONContent) {
    if (node.type === 'taskItem') {
      const taskId = node.attrs?.taskId || nanoid();
      const checked = node.attrs?.checked || false;
      const nodeOriginDate = node.attrs?.originDate || originDate;
      
      // Extract text content
      let text = '';
      if (node.content) {
        text = node.content
          .map(child => {
            if (child.type === 'text') {
              return child.text || '';
            }
            return '';
          })
          .join('');
      }

      tasks.push({
        taskId,
        text: text.trim(),
        checked,
        originDate: nodeOriginDate,
      });
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  }

  if (content.content) {
    content.content.forEach(traverse);
  }

  return tasks;
}

/**
 * Create a task item node for TipTap JSON
 */
function createTaskItemNode(task: TaskNode): JSONContent {
  return {
    type: 'taskItem',
    attrs: {
      taskId: task.taskId,
      checked: task.checked,
      originDate: task.originDate,
    },
    content: [
      {
        type: 'text',
        text: task.text,
      },
    ],
  };
}

/**
 * Roll over unchecked tasks from yesterday to today
 */
export async function rolloverTasks(todayDate: string): Promise<void> {
  const yesterdayDate = getDaysAgo(1);
  
  // Load yesterday's note
  const yesterdayNote = await loadDailyNote(yesterdayDate);
  if (!yesterdayNote) {
    return; // No yesterday note, nothing to roll over
  }

  // Extract unchecked tasks
  const tasks = extractTasksFromContent(yesterdayNote.content, yesterdayDate);
  const uncheckedTasks = tasks.filter(task => !task.checked);

  if (uncheckedTasks.length === 0) {
    return; // No unchecked tasks
  }

  // Get or create today's note
  const todayNote = await getOrCreateDailyNote(todayDate);

  // Check if we've already rolled over (avoid duplicates)
  const existingTasks = extractTasksFromContent(todayNote.content, todayDate);
  const existingTaskIds = new Set(existingTasks.map(t => t.taskId));
  
  const tasksToAdd = uncheckedTasks.filter(task => !existingTaskIds.has(task.taskId));

  if (tasksToAdd.length === 0) {
    return; // Already rolled over
  }

  // Create a task list with rolled-over tasks
  const taskListNode: JSONContent = {
    type: 'taskList',
    content: tasksToAdd.map(createTaskItemNode),
  };

  // Prepend to today's content
  const updatedContent: JSONContent = {
    ...todayNote.content,
    content: [
      taskListNode,
      ...(todayNote.content.content || []),
    ],
  };

  // Save updated note
  await saveDailyNote({
    ...todayNote,
    content: updatedContent,
  });
}

/**
 * Check if rollover is needed and run it
 */
export async function checkAndRunRollover(todayDate: string): Promise<void> {
  try {
    await rolloverTasks(todayDate);
  } catch (error) {
    console.error('Task rollover failed:', error);
  }
}
