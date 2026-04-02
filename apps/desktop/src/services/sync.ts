import {
  buildConflictCopyPath,
  classifySyncPath,
  getSyncStorageType,
  hashContent,
  normalizeSyncPath,
  resolveSyncWrite,
  type SyncDocument,
  type SyncKind,
  type SyncStatusSnapshot,
} from "@philo/core";
import { createClient, type SupabaseClient, } from "@supabase/supabase-js";
import { dirname, join, } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { getAssetsDir, getBaseDir, getExcalidrawDir, getJournalDir, getPagesDir, getWidgetsDir, } from "./paths";
import { loadSettings, saveSettings, type Settings, } from "./settings";

const SYNC_TABLE = "sync_documents";
const SYNC_BUCKET = "sync-blobs";
const SYNC_STATE_FILE = "sync-state.json";
export const SYNC_DEEP_LINK_EVENT = "philo:deep-link-opened";
export const SYNC_REDIRECT_URL = "philo://sync-auth";

type SyncDocumentRow = {
  blob_key: string | null;
  content_hash: string;
  deleted_at: string | null;
  kind: SyncKind;
  path: string;
  revision: number;
  text_content: string | null;
  updated_at: string;
  updated_by_device_id: string;
  user_id: string;
};

interface SyncStateRecord {
  contentHash: string;
  deletedAt: string | null;
  kind: SyncKind;
  revision: number;
}

interface DesktopSyncState {
  documents: Record<string, SyncStateRecord>;
  version: 1;
}

interface SyncRoots {
  assetsDir: string;
  excalidrawDir: string | null;
  journalDir: string;
  pagesDir: string;
  widgetsDir: string;
}

interface LocalSnapshot {
  absolutePath: string;
  bytes: Uint8Array | null;
  contentHash: string;
  kind: SyncKind;
  path: string;
  storageType: "blob" | "text";
  textContent: string | null;
}

let activeSyncPromise: Promise<boolean> | null = null;
let scheduledSyncTimeout: ReturnType<typeof setTimeout> | null = null;

function getSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

  return url && anonKey ? { anonKey, url, } : null;
}

function createSyncClient() {
  const env = getSupabaseEnv();
  if (!env) return null;

  return createClient(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
      persistSession: false,
    },
  },);
}

function normalizeAbsolutePath(path: string,) {
  return path.replace(/\\/g, "/",).replace(/\/$/, "",);
}

function pathIsWithinRoot(path: string, root: string,) {
  const normalizedPath = normalizeAbsolutePath(path,);
  const normalizedRoot = normalizeAbsolutePath(root,);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`,);
}

function relativeToRoot(path: string, root: string,) {
  const normalizedPath = normalizeAbsolutePath(path,);
  const normalizedRoot = normalizeAbsolutePath(root,);
  if (normalizedPath === normalizedRoot) return "";
  return normalizedPath.slice(normalizedRoot.length + 1,);
}

function joinSyncPath(prefix: string, suffix: string,) {
  return normalizeSyncPath(suffix ? `${prefix}/${suffix}` : prefix,);
}

function getBlobObjectKey(path: string, contentHash: string,) {
  const normalized = normalizeSyncPath(path,);
  const safePath = normalized.replace(/[^a-zA-Z0-9._/-]+/g, "-",);
  const safeHash = contentHash.replace(/[^a-zA-Z0-9._-]+/g, "-",);
  return `${safeHash}/${safePath}`;
}

function getSyncStatusSnapshot(settings: Settings, errorMessage?: string | null,): SyncStatusSnapshot {
  return {
    state: errorMessage
      ? "error"
      : settings.syncEnabled && settings.syncAccessToken && settings.syncRefreshToken
      ? "idle"
      : "offline",
    lastSyncedAt: settings.syncLastSyncedAt || null,
    errorMessage: errorMessage ?? settings.syncError ?? null,
    pendingDownloads: 0,
    pendingUploads: 0,
  };
}

async function ensureSyncDeviceId(settings: Settings,) {
  if (settings.syncDeviceId.trim()) {
    return settings.syncDeviceId.trim();
  }

  const deviceId = globalThis.crypto?.randomUUID?.() ?? `desktop-${Date.now()}`;
  const nextSettings = { ...settings, syncDeviceId: deviceId, };
  await saveSettings(nextSettings,);
  return deviceId;
}

async function getSyncStatePath() {
  const baseDir = await getBaseDir();
  return await join(baseDir, SYNC_STATE_FILE,);
}

async function loadSyncState(): Promise<DesktopSyncState> {
  const path = await getSyncStatePath();
  if (!(await exists(path,))) {
    return { version: 1, documents: {}, };
  }

  try {
    const parsed = JSON.parse(await readTextFile(path,),) as Partial<DesktopSyncState>;
    return {
      version: 1,
      documents: parsed.documents ?? {},
    };
  } catch {
    return { version: 1, documents: {}, };
  }
}

async function saveSyncState(state: DesktopSyncState,) {
  const path = await getSyncStatePath();
  const parent = await dirname(path,);
  if (!(await exists(parent,))) {
    await mkdir(parent, { recursive: true, },);
  }
  await writeTextFile(path, `${JSON.stringify(state, null, 2,)}\n`,);
}

async function listFilesRecursive(rootDir: string,): Promise<string[]> {
  if (!(await exists(rootDir,))) return [];

  const entries = await readDir(rootDir,);
  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.name) continue;

    const fullPath = await join(rootDir, entry.name,);
    if (entry.isDirectory) {
      files.push(...await listFilesRecursive(fullPath,),);
      continue;
    }

    if (entry.isFile) {
      files.push(fullPath,);
    }
  }

  return files;
}

async function getSyncRoots(): Promise<SyncRoots> {
  return {
    assetsDir: await getAssetsDir(),
    excalidrawDir: await getExcalidrawDir(),
    journalDir: await getJournalDir(),
    pagesDir: await getPagesDir(),
    widgetsDir: await getWidgetsDir(),
  };
}

function toSyncPath(absolutePath: string, roots: SyncRoots,): string | null {
  if (pathIsWithinRoot(absolutePath, roots.pagesDir,)) {
    return joinSyncPath("pages", relativeToRoot(absolutePath, roots.pagesDir,),);
  }
  if (pathIsWithinRoot(absolutePath, roots.widgetsDir,)) {
    return joinSyncPath("widgets", relativeToRoot(absolutePath, roots.widgetsDir,),);
  }
  if (pathIsWithinRoot(absolutePath, roots.assetsDir,)) {
    return joinSyncPath("assets", relativeToRoot(absolutePath, roots.assetsDir,),);
  }
  if (roots.excalidrawDir && pathIsWithinRoot(absolutePath, roots.excalidrawDir,)) {
    return joinSyncPath("excalidraw", relativeToRoot(absolutePath, roots.excalidrawDir,),);
  }
  if (pathIsWithinRoot(absolutePath, roots.journalDir,)) {
    return normalizeSyncPath(relativeToRoot(absolutePath, roots.journalDir,),);
  }
  return null;
}

async function toAbsolutePath(syncPath: string, roots: SyncRoots,) {
  const normalized = normalizeSyncPath(syncPath,);

  if (normalized.startsWith("pages/",)) {
    return await join(roots.pagesDir, normalized.slice("pages/".length,),);
  }
  if (normalized.startsWith("widgets/",)) {
    return await join(roots.widgetsDir, normalized.slice("widgets/".length,),);
  }
  if (normalized.startsWith("assets/",)) {
    return await join(roots.assetsDir, normalized.slice("assets/".length,),);
  }
  if (normalized.startsWith("excalidraw/",)) {
    if (!roots.excalidrawDir) return null;
    return await join(roots.excalidrawDir, normalized.slice("excalidraw/".length,),);
  }

  return await join(roots.journalDir, normalized,);
}

async function ensureParentDir(path: string,) {
  const parent = await dirname(path,);
  if (!(await exists(parent,))) {
    await mkdir(parent, { recursive: true, },);
  }
}

async function readLocalSnapshot(
  absolutePath: string,
  syncPath: string,
): Promise<LocalSnapshot | null> {
  const kind = classifySyncPath(syncPath,);
  if (!kind) return null;

  const storageType = getSyncStorageType(kind,);
  if (storageType === "text") {
    const textContent = await readTextFile(absolutePath,);
    return {
      absolutePath,
      bytes: null,
      contentHash: hashContent(textContent,),
      kind,
      path: syncPath,
      storageType,
      textContent,
    };
  }

  const bytes = await readFile(absolutePath,);
  return {
    absolutePath,
    bytes,
    contentHash: hashContent(bytes,),
    kind,
    path: syncPath,
    storageType,
    textContent: null,
  };
}

async function collectLocalSnapshots(roots: SyncRoots,) {
  const seenAbsolutePaths = new Set<string>();
  const snapshots = new Map<string, LocalSnapshot>();

  const scanOrder: Array<string | null> = [
    roots.pagesDir,
    roots.widgetsDir,
    roots.assetsDir,
    roots.excalidrawDir,
    roots.journalDir,
  ];

  for (const root of scanOrder) {
    if (!root || !(await exists(root,))) continue;

    for (const absolutePath of await listFilesRecursive(root,)) {
      const normalizedAbsolutePath = normalizeAbsolutePath(absolutePath,);
      if (seenAbsolutePaths.has(normalizedAbsolutePath,)) continue;
      seenAbsolutePaths.add(normalizedAbsolutePath,);

      const syncPath = toSyncPath(absolutePath, roots,);
      if (!syncPath) continue;

      const snapshot = await readLocalSnapshot(absolutePath, syncPath,);
      if (snapshot) {
        snapshots.set(snapshot.path, snapshot,);
      }
    }
  }

  return snapshots;
}

async function writeSnapshotToDisk(
  snapshot: Pick<LocalSnapshot, "bytes" | "path" | "textContent" | "storageType">,
  roots: SyncRoots,
) {
  const absolutePath = await toAbsolutePath(snapshot.path, roots,);
  if (!absolutePath) return;

  await ensureParentDir(absolutePath,);
  if (snapshot.storageType === "text") {
    await writeTextFile(absolutePath, snapshot.textContent ?? "",);
  } else if (snapshot.bytes) {
    await writeFile(absolutePath, snapshot.bytes,);
  }
}

async function removeSnapshotFromDisk(path: string, roots: SyncRoots,) {
  const absolutePath = await toAbsolutePath(path, roots,);
  if (!absolutePath || !(await exists(absolutePath,))) return;
  await remove(absolutePath,);
}

async function createConflictCopy(snapshot: LocalSnapshot, deviceId: string, timestamp: string, roots: SyncRoots,) {
  const conflictPath = buildConflictCopyPath(snapshot.path, deviceId, timestamp,);
  await writeSnapshotToDisk({
    bytes: snapshot.bytes,
    path: conflictPath,
    storageType: snapshot.storageType,
    textContent: snapshot.textContent,
  }, roots,);
  return conflictPath;
}

async function ensureSession(client: SupabaseClient, settings: Settings,) {
  if (!settings.syncAccessToken.trim() || !settings.syncRefreshToken.trim()) {
    return null;
  }

  const { data, error, } = await client.auth.setSession({
    access_token: settings.syncAccessToken.trim(),
    refresh_token: settings.syncRefreshToken.trim(),
  },);
  if (error || !data.session) {
    return null;
  }
  return data.session;
}

async function updateSyncSettings(patch: Partial<Settings>,) {
  const current = await loadSettings();
  const next = { ...current, ...patch, };
  await saveSettings(next,);
  return next;
}

function parseAuthPayload(url: string,) {
  const parsed = new URL(url,);
  const params = parsed.hash.startsWith("#",)
    ? new URLSearchParams(parsed.hash.slice(1,),)
    : parsed.searchParams;

  const accessToken = params.get("access_token",)?.trim() ?? "";
  const refreshToken = params.get("refresh_token",)?.trim() ?? "";
  return accessToken && refreshToken ? { accessToken, refreshToken, } : null;
}

async function fetchRemoteDocuments(client: SupabaseClient, userId: string,) {
  const { data, error, } = await client
    .from(SYNC_TABLE,)
    .select(
      "user_id, path, kind, revision, content_hash, text_content, blob_key, deleted_at, updated_at, updated_by_device_id",
    )
    .eq("user_id", userId,)
    .order("path", { ascending: true, },);

  if (error) {
    throw error;
  }

  return (data ?? []) as SyncDocumentRow[];
}

async function uploadRemoteDocument(
  client: SupabaseClient,
  userId: string,
  deviceId: string,
  snapshot: LocalSnapshot,
  nextRevision: number,
) {
  let blobKey: string | null = null;

  if (snapshot.storageType === "blob" && snapshot.bytes) {
    blobKey = getBlobObjectKey(snapshot.path, snapshot.contentHash,);
    const { error: uploadError, } = await client.storage.from(SYNC_BUCKET,).upload(blobKey, snapshot.bytes, {
      cacheControl: "3600",
      contentType: undefined,
      upsert: true,
    },);
    if (uploadError) {
      throw uploadError;
    }
  }

  const payload: SyncDocumentRow = {
    blob_key: blobKey,
    content_hash: snapshot.contentHash,
    deleted_at: null,
    kind: snapshot.kind,
    path: snapshot.path,
    revision: nextRevision,
    text_content: snapshot.storageType === "text" ? snapshot.textContent : null,
    updated_at: new Date().toISOString(),
    updated_by_device_id: deviceId,
    user_id: userId,
  };

  const { data, error, } = await client
    .from(SYNC_TABLE,)
    .upsert(payload, { onConflict: "user_id,path", },)
    .select(
      "user_id, path, kind, revision, content_hash, text_content, blob_key, deleted_at, updated_at, updated_by_device_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as SyncDocumentRow;
}

async function uploadRemoteDeletion(
  client: SupabaseClient,
  row: SyncDocumentRow,
  deviceId: string,
) {
  const payload: SyncDocumentRow = {
    ...row,
    blob_key: null,
    deleted_at: new Date().toISOString(),
    revision: row.revision + 1,
    text_content: null,
    updated_at: new Date().toISOString(),
    updated_by_device_id: deviceId,
  };

  const { data, error, } = await client
    .from(SYNC_TABLE,)
    .upsert(payload, { onConflict: "user_id,path", },)
    .select(
      "user_id, path, kind, revision, content_hash, text_content, blob_key, deleted_at, updated_at, updated_by_device_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as SyncDocumentRow;
}

async function downloadRemoteSnapshot(client: SupabaseClient, row: SyncDocumentRow,) {
  if (getSyncStorageType(row.kind,) === "text") {
    return {
      bytes: null,
      path: row.path,
      storageType: "text" as const,
      textContent: row.text_content ?? "",
    };
  }

  if (!row.blob_key) {
    throw new Error(`Remote blob is missing for ${row.path}.`,);
  }

  const { data, error, } = await client.storage.from(SYNC_BUCKET,).download(row.blob_key,);
  if (error) {
    throw error;
  }
  const bytes = new Uint8Array(await data.arrayBuffer(),);
  return {
    bytes,
    path: row.path,
    storageType: "blob" as const,
    textContent: null,
  };
}

async function applyRemoteDocuments(
  client: SupabaseClient,
  rows: SyncDocumentRow[],
  localSnapshots: Map<string, LocalSnapshot>,
  state: DesktopSyncState,
  roots: SyncRoots,
  deviceId: string,
  errors: string[],
) {
  for (const row of rows) {
    const stateEntry = state.documents[row.path];
    const localSnapshot = localSnapshots.get(row.path,) ?? null;
    const localUnchanged = !localSnapshot || (
      !!stateEntry
      && localSnapshot.contentHash === stateEntry.contentHash
      && localSnapshot.kind === stateEntry.kind
    );

    if (row.deleted_at) {
      if (!localSnapshot || localUnchanged) {
        await removeSnapshotFromDisk(row.path, roots,);
        state.documents[row.path] = {
          contentHash: row.content_hash,
          deletedAt: row.deleted_at,
          kind: row.kind,
          revision: row.revision,
        };
      } else {
        errors.push(`Skipped remote deletion for ${row.path} because the local file changed.`,);
      }
      continue;
    }

    const remoteIsNewer = !stateEntry || row.revision > stateEntry.revision
      || row.content_hash !== stateEntry.contentHash;
    if (!remoteIsNewer) {
      continue;
    }

    if (localSnapshot && !localUnchanged) {
      if (localSnapshot.storageType === "text") {
        await createConflictCopy(localSnapshot, deviceId, row.updated_at || new Date().toISOString(), roots,);
      } else {
        errors.push(`Skipped remote blob update for ${row.path} because the local blob changed.`,);
        continue;
      }
    }

    const remoteSnapshot = await downloadRemoteSnapshot(client, row,);
    await writeSnapshotToDisk(remoteSnapshot, roots,);
    state.documents[row.path] = {
      contentHash: row.content_hash,
      deletedAt: row.deleted_at,
      kind: row.kind,
      revision: row.revision,
    };
  }
}

async function pushLocalDocuments(
  client: SupabaseClient,
  userId: string,
  deviceId: string,
  localSnapshots: Map<string, LocalSnapshot>,
  remoteRows: Map<string, SyncDocumentRow>,
  state: DesktopSyncState,
  roots: SyncRoots,
  errors: string[],
) {
  for (const snapshot of localSnapshots.values()) {
    const remoteRow = remoteRows.get(snapshot.path,) ?? null;
    const stateEntry = state.documents[snapshot.path] ?? null;
    const result = resolveSyncWrite({
      baseRevision: stateEntry?.revision ?? null,
      deviceId,
      kind: snapshot.kind,
      localHash: snapshot.contentHash,
      path: snapshot.path,
      remoteHash: remoteRow?.content_hash ?? null,
      remoteRevision: remoteRow?.revision ?? null,
    },);

    if (result.status === "noop" && remoteRow) {
      state.documents[snapshot.path] = {
        contentHash: remoteRow.content_hash,
        deletedAt: remoteRow.deleted_at,
        kind: remoteRow.kind,
        revision: remoteRow.revision,
      };
      continue;
    }

    if (result.status === "conflict") {
      if (snapshot.storageType === "text" && remoteRow && !remoteRow.deleted_at) {
        await createConflictCopy(snapshot, deviceId, result.conflict?.detectedAt ?? new Date().toISOString(), roots,);
        const remoteSnapshot = await downloadRemoteSnapshot(client, remoteRow,);
        await writeSnapshotToDisk(remoteSnapshot, roots,);
        state.documents[snapshot.path] = {
          contentHash: remoteRow.content_hash,
          deletedAt: remoteRow.deleted_at,
          kind: remoteRow.kind,
          revision: remoteRow.revision,
        };
      } else {
        errors.push(`Skipped uploading ${snapshot.path} because the remote revision changed.`,);
      }
      continue;
    }

    const savedRow = await uploadRemoteDocument(client, userId, deviceId, snapshot, result.nextRevision ?? 1,);
    remoteRows.set(savedRow.path, savedRow,);
    state.documents[savedRow.path] = {
      contentHash: savedRow.content_hash,
      deletedAt: savedRow.deleted_at,
      kind: savedRow.kind,
      revision: savedRow.revision,
    };
  }

  for (const [path, stateEntry,] of Object.entries(state.documents,)) {
    if (localSnapshots.has(path,) || stateEntry.deletedAt) continue;
    const remoteRow = remoteRows.get(path,);
    if (!remoteRow || remoteRow.deleted_at || remoteRow.revision !== stateEntry.revision) {
      continue;
    }

    const deletedRow = await uploadRemoteDeletion(client, remoteRow, deviceId,);
    remoteRows.set(path, deletedRow,);
    state.documents[path] = {
      contentHash: deletedRow.content_hash,
      deletedAt: deletedRow.deleted_at,
      kind: deletedRow.kind,
      revision: deletedRow.revision,
    };
  }
}

export function getDesktopSyncCapability(settings: Settings,) {
  const env = getSupabaseEnv();
  const authenticated = Boolean(settings.syncAccessToken.trim() && settings.syncRefreshToken.trim(),);

  return {
    authenticated,
    configured: Boolean(env,),
    enabled: settings.syncEnabled === true,
    hasPendingError: Boolean(settings.syncError.trim(),),
    status: getSyncStatusSnapshot(settings,),
  };
}

export async function requestDesktopSyncMagicLink(email: string,) {
  const client = createSyncClient();
  if (!client) {
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before enabling sync.",);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Enter an email address first.",);
  }

  const { error, } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: SYNC_REDIRECT_URL,
      shouldCreateUser: true,
    },
  },);
  if (error) {
    throw error;
  }

  await updateSyncSettings({
    syncEmail: normalizedEmail,
    syncError: "",
  },);
}

export async function consumeDesktopSyncAuthCallback(url: string,) {
  const client = createSyncClient();
  if (!client) {
    throw new Error("Missing Supabase sync configuration.",);
  }

  const auth = parseAuthPayload(url,);
  if (!auth) {
    throw new Error("Sync link did not include a valid session.",);
  }

  const { data, error, } = await client.auth.setSession({
    access_token: auth.accessToken,
    refresh_token: auth.refreshToken,
  },);
  if (error || !data.session) {
    throw error ?? new Error("Could not start sync session.",);
  }

  const syncEmail = data.session.user.email?.trim().toLowerCase() ?? "";
  await updateSyncSettings({
    syncAccessToken: data.session.access_token,
    syncEmail,
    syncEnabled: true,
    syncError: "",
    syncLastSyncedAt: "",
    syncRefreshToken: data.session.refresh_token,
  },);

  return data.session;
}

export async function clearDesktopSyncSession() {
  const settings = await loadSettings();
  await saveSettings({
    ...settings,
    syncAccessToken: "",
    syncError: "",
    syncRefreshToken: "",
  },);
}

export async function syncDesktopNow() {
  if (activeSyncPromise) {
    return await activeSyncPromise;
  }

  const task = (async () => {
    let settings = await loadSettings();
    if (!settings.syncEnabled) {
      return false;
    }

    const client = createSyncClient();
    if (!client) {
      await updateSyncSettings({ syncError: "Missing Supabase sync environment variables.", },);
      return false;
    }

    const deviceId = await ensureSyncDeviceId(settings,);
    settings = await loadSettings();

    const session = await ensureSession(client, settings,);
    if (!session) {
      await updateSyncSettings({ syncError: "Sync sign-in expired. Request a new magic link.", },);
      return false;
    }

    const roots = await getSyncRoots();
    const state = await loadSyncState();
    const localBeforePull = await collectLocalSnapshots(roots,);
    const remoteRows = await fetchRemoteDocuments(client, session.user.id,);
    const remoteMap = new Map(remoteRows.map((row,) => [row.path, row,] as const),);
    const errors: string[] = [];

    await applyRemoteDocuments(client, remoteRows, localBeforePull, state, roots, deviceId, errors,);

    const localSnapshots = await collectLocalSnapshots(roots,);
    await pushLocalDocuments(client, session.user.id, deviceId, localSnapshots, remoteMap, state, roots, errors,);

    await saveSyncState(state,);
    const syncedAt = new Date().toISOString();
    await updateSyncSettings({
      syncError: errors.join(" ",).trim(),
      syncLastSyncedAt: syncedAt,
    },);

    return true;
  })();

  activeSyncPromise = task.finally(() => {
    activeSyncPromise = null;
  },);

  return await activeSyncPromise;
}

export function scheduleDesktopSync(delayMs = 1500,) {
  if (scheduledSyncTimeout) {
    clearTimeout(scheduledSyncTimeout,);
  }

  scheduledSyncTimeout = setTimeout(() => {
    scheduledSyncTimeout = null;
    void syncDesktopNow().catch(async (error,) => {
      console.error(error,);
      await updateSyncSettings({
        syncError: error instanceof Error ? error.message : "Desktop sync failed.",
      },);
    },);
  }, delayMs,);
}

export function formatSyncTimestamp(value: string,) {
  const trimmed = value.trim();
  if (!trimmed) return "Never";

  const parsed = new Date(trimmed,);
  if (Number.isNaN(parsed.getTime(),)) {
    return "Never";
  }

  return parsed.toLocaleString();
}

export function formatSyncError(value: string,) {
  return value.trim() || "No sync errors.";
}

export function describeSyncSession(settings: Settings,) {
  if (!getSupabaseEnv()) {
    return "Supabase env vars are missing.";
  }
  if (!settings.syncAccessToken.trim() || !settings.syncRefreshToken.trim()) {
    return "Not connected";
  }
  return settings.syncEmail.trim() || "Connected";
}

export function createSyncDocument(input: SyncDocumentRow,): SyncDocument {
  return {
    blobKey: input.blob_key,
    contentHash: input.content_hash,
    deletedAt: input.deleted_at,
    kind: input.kind,
    path: input.path,
    revision: input.revision,
    textContent: input.text_content,
    updatedAt: input.updated_at,
    updatedByDeviceId: input.updated_by_device_id,
  };
}
