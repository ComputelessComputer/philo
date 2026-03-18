import { invoke, } from "@tauri-apps/api/core";
import { getWidgetsDir, } from "./paths";
import { getWidgetGitHistoryEnabledSetting, } from "./settings";
import {
  parseWidgetGitSnapshot,
  serializeWidgetGitSnapshot,
  toWidgetGitSnapshot,
  type WidgetFileRecord,
  type WidgetGitSnapshotRecord,
} from "./widget-files";

export type WidgetGitReason = "create" | "rebuild" | "edit" | "insert" | "archive" | "restore" | "import";

export interface WidgetGitHistoryEntry {
  commitId: string;
  reason: WidgetGitReason | "update";
  title: string;
  createdAt: string;
}

export interface WidgetGitDiff {
  commitId: string;
  parentCommitId: string | null;
  unifiedDiff: string;
  canRestore: boolean;
  blockedReason: string | null;
}

interface WidgetGitRestoreResult {
  commitId: string;
  snapshot: string;
}

function stripLeadingWidgetsSegment(path: string,): string {
  return path.replace(/^widgets\//, "",).replace(/^\/+/, "",);
}

async function resolveWidgetHistoryPath(record: Pick<WidgetFileRecord, "file" | "path">,) {
  const widgetsRoot = await getWidgetsDir();
  const absolutePath = record.path.trim();
  if (absolutePath.startsWith(`${widgetsRoot}/`,)) {
    return {
      widgetsRoot,
      relativeWidgetPath: absolutePath.slice(widgetsRoot.length + 1,),
    };
  }

  const relativeWidgetPath = stripLeadingWidgetsSegment(record.file,);
  if (!relativeWidgetPath) {
    throw new Error("Widget history path is missing.",);
  }

  return { widgetsRoot, relativeWidgetPath, };
}

export function hasMaterialWidgetGitChange(
  previousRecord:
    | Pick<
      WidgetFileRecord,
      | "id"
      | "title"
      | "prompt"
      | "runtime"
      | "saved"
      | "spec"
      | "source"
      | "libraryItemId"
      | "componentId"
      | "storageSchema"
    >
    | null
    | undefined,
  nextRecord: Pick<
    WidgetFileRecord,
    | "id"
    | "title"
    | "prompt"
    | "runtime"
    | "saved"
    | "spec"
    | "source"
    | "libraryItemId"
    | "componentId"
    | "storageSchema"
  >,
): boolean {
  const nextSnapshot = serializeWidgetGitSnapshot(toWidgetGitSnapshot(nextRecord,),).trim();
  const previousSnapshot = previousRecord
    ? serializeWidgetGitSnapshot(toWidgetGitSnapshot(previousRecord,),).trim()
    : "";
  return nextSnapshot !== previousSnapshot;
}

export async function isWidgetGitHistoryEnabled(): Promise<boolean> {
  return await getWidgetGitHistoryEnabledSetting();
}

export async function ensureWidgetGitHistoryBaseline(
  record: Pick<
    WidgetFileRecord,
    | "id"
    | "title"
    | "prompt"
    | "runtime"
    | "saved"
    | "spec"
    | "source"
    | "libraryItemId"
    | "componentId"
    | "storageSchema"
    | "file"
    | "path"
  >,
): Promise<void> {
  if (!(await isWidgetGitHistoryEnabled())) return;
  const { widgetsRoot, relativeWidgetPath, } = await resolveWidgetHistoryPath(record,);
  await invoke("ensure_widget_git_history_baseline", {
    input: {
      widgetsRoot,
      relativeWidgetPath,
      snapshot: serializeWidgetGitSnapshot(toWidgetGitSnapshot(record,),),
      title: record.title,
    },
  },);
}

export async function recordWidgetGitRevision(
  record: Pick<
    WidgetFileRecord,
    | "id"
    | "title"
    | "prompt"
    | "runtime"
    | "saved"
    | "spec"
    | "source"
    | "libraryItemId"
    | "componentId"
    | "storageSchema"
    | "file"
    | "path"
  >,
  reason: Exclude<WidgetGitReason, "import">,
  previousRecord?:
    | Pick<
      WidgetFileRecord,
      | "id"
      | "title"
      | "prompt"
      | "runtime"
      | "saved"
      | "spec"
      | "source"
      | "libraryItemId"
      | "componentId"
      | "storageSchema"
    >
    | null,
): Promise<void> {
  if (!(await isWidgetGitHistoryEnabled())) return;
  if (!hasMaterialWidgetGitChange(previousRecord, record,)) return;
  const { widgetsRoot, relativeWidgetPath, } = await resolveWidgetHistoryPath(record,);
  await invoke("record_widget_git_revision", {
    input: {
      widgetsRoot,
      relativeWidgetPath,
      snapshot: serializeWidgetGitSnapshot(toWidgetGitSnapshot(record,),),
      previousSnapshot: previousRecord
        ? serializeWidgetGitSnapshot(toWidgetGitSnapshot(previousRecord,),)
        : undefined,
      reason,
      title: record.title,
    },
  },);
}

export async function listWidgetGitHistory(
  record: Pick<WidgetFileRecord, "file" | "path">,
): Promise<WidgetGitHistoryEntry[]> {
  const { widgetsRoot, relativeWidgetPath, } = await resolveWidgetHistoryPath(record,);
  return await invoke<WidgetGitHistoryEntry[]>("list_widget_git_history", {
    input: { widgetsRoot, relativeWidgetPath, },
  },);
}

export async function getWidgetGitDiff(
  record: Pick<WidgetFileRecord, "file" | "path">,
  commitId: string,
): Promise<WidgetGitDiff> {
  const { widgetsRoot, relativeWidgetPath, } = await resolveWidgetHistoryPath(record,);
  return await invoke<WidgetGitDiff>("get_widget_git_diff", {
    input: {
      widgetsRoot,
      relativeWidgetPath,
      commitId,
    },
  },);
}

export async function restoreWidgetGitRevision(
  record: Pick<WidgetFileRecord, "file" | "path">,
  commitId: string,
): Promise<{ commitId: string; snapshot: WidgetGitSnapshotRecord; }> {
  const { widgetsRoot, relativeWidgetPath, } = await resolveWidgetHistoryPath(record,);
  const result = await invoke<WidgetGitRestoreResult>("restore_widget_git_revision", {
    input: {
      widgetsRoot,
      relativeWidgetPath,
      commitId,
    },
  },);
  const snapshot = parseWidgetGitSnapshot(result.snapshot,);
  if (!snapshot) {
    throw new Error("Could not parse widget revision snapshot.",);
  }

  return {
    commitId: result.commitId,
    snapshot,
  };
}
