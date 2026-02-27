import { invoke, } from "@tauri-apps/api/core";
import { join, } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile, } from "@tauri-apps/plugin-fs";

interface FolderDetection {
  dailyLogsFolder: string;
  excalidrawFolder: string;
  assetsFolder: string;
}

interface VaultBootstrapOptions {
  dailyLogsFolder: string;
  excalidrawFolder?: string;
  assetsFolder?: string;
}

function asRecord(value: unknown,): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown,): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFolder(value: string | null,): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "/" || trimmed === "./" || trimmed === ".") return ".";
  return trimmed.replace(/^\.?\//, "",).replace(/\/+$/, "",);
}

async function ensureVaultFolder(vaultDir: string, folder: string | null | undefined,) {
  const normalized = normalizeFolder(folder ?? "",);
  if (!normalized || normalized === ".") return;
  await mkdir(await join(vaultDir, normalized,), { recursive: true, },);
}

async function readJson(path: string,): Promise<Record<string, unknown> | null> {
  const fileExists = await exists(path,);
  if (!fileExists) return null;
  try {
    const raw = await readTextFile(path,);
    const parsed = JSON.parse(raw,);
    return asRecord(parsed,);
  } catch {
    return null;
  }
}

function detectDailyLogsFolder(
  dailyNotesConfig: Record<string, unknown> | null,
  periodicNotesConfig: Record<string, unknown> | null,
): string {
  const fromDailyNotes = asString(dailyNotesConfig?.folder,);
  if (fromDailyNotes) return normalizeFolder(fromDailyNotes,);

  const periodicDaily = asRecord(periodicNotesConfig?.daily,);
  const fromPeriodicNotes = asString(periodicDaily?.folder,);
  if (fromPeriodicNotes) return normalizeFolder(fromPeriodicNotes,);

  return "";
}

function detectAssetsFolder(appConfig: Record<string, unknown> | null,): string {
  return normalizeFolder(asString(appConfig?.attachmentFolderPath,),);
}

function detectExcalidrawFolder(excalidrawConfig: Record<string, unknown> | null,): string {
  if (!excalidrawConfig) return "";

  const explicit = [
    asString(excalidrawConfig.folder,),
    asString(excalidrawConfig.excalidrawFolder,),
    asString(excalidrawConfig.drawingFolder,),
    asString(excalidrawConfig.drawingFolderPath,),
    asString(excalidrawConfig.folderPath,),
  ].find((value,) => !!value);

  if (explicit) return normalizeFolder(explicit,);

  for (const [key, value,] of Object.entries(excalidrawConfig,)) {
    const asText = asString(value,);
    if (!asText) continue;
    if (!/folder|path|dir/i.test(key,)) continue;
    if (/excalidraw/i.test(key,) || /excalidraw/i.test(asText,)) {
      return normalizeFolder(asText,);
    }
  }

  return "";
}

export async function detectObsidianFolders(vaultDir: string,): Promise<FolderDetection> {
  const normalizedVaultDir = vaultDir.trim();
  if (!normalizedVaultDir) {
    return { dailyLogsFolder: "", excalidrawFolder: "", assetsFolder: "", };
  }

  await invoke("extend_fs_scope", { path: normalizedVaultDir, },).catch(() => undefined);

  const obsidianDir = await join(normalizedVaultDir, ".obsidian",);
  const [dailyNotesConfig, periodicNotesConfig, appConfig, excalidrawConfig,] = await Promise.all([
    readJson(await join(obsidianDir, "daily-notes.json",),),
    readJson(await join(obsidianDir, "plugins", "periodic-notes", "data.json",),),
    readJson(await join(obsidianDir, "app.json",),),
    readJson(await join(obsidianDir, "plugins", "obsidian-excalidraw-plugin", "data.json",),),
  ],);

  return {
    dailyLogsFolder: detectDailyLogsFolder(dailyNotesConfig, periodicNotesConfig,),
    excalidrawFolder: detectExcalidrawFolder(excalidrawConfig,),
    assetsFolder: detectAssetsFolder(appConfig,),
  };
}

export async function ensureObsidianVaultStructure(
  vaultDir: string,
  options: VaultBootstrapOptions,
): Promise<void> {
  const normalizedVaultDir = vaultDir.trim();
  if (!normalizedVaultDir) return;

  await invoke("extend_fs_scope", { path: normalizedVaultDir, },).catch(() => undefined);

  const obsidianDir = await join(normalizedVaultDir, ".obsidian",);
  if (await exists(obsidianDir,)) return;

  await mkdir(obsidianDir, { recursive: true, },);

  const normalizedDaily = normalizeFolder(options.dailyLogsFolder,);
  const normalizedExcalidraw = normalizeFolder(options.excalidrawFolder ?? "",);
  const normalizedAssets = normalizeFolder(options.assetsFolder ?? "",);

  await ensureVaultFolder(normalizedVaultDir, normalizedDaily,);
  await ensureVaultFolder(normalizedVaultDir, normalizedExcalidraw,);
  await ensureVaultFolder(normalizedVaultDir, normalizedAssets,);

  if (normalizedDaily && normalizedDaily !== ".") {
    const dailyNotesPath = await join(obsidianDir, "daily-notes.json",);
    await writeTextFile(
      dailyNotesPath,
      JSON.stringify(
        {
          format: "YYYY-MM-DD",
          folder: normalizedDaily,
          template: "",
        },
        null,
        2,
      ),
    );
  }

  if (normalizedAssets && normalizedAssets !== ".") {
    const appConfigPath = await join(obsidianDir, "app.json",);
    await writeTextFile(
      appConfigPath,
      JSON.stringify(
        {
          attachmentFolderPath: normalizedAssets,
        },
        null,
        2,
      ),
    );
  }

  if (normalizedExcalidraw && normalizedExcalidraw !== ".") {
    const excalidrawPluginDir = await join(obsidianDir, "plugins", "obsidian-excalidraw-plugin",);
    await mkdir(excalidrawPluginDir, { recursive: true, },);
    await writeTextFile(
      await join(excalidrawPluginDir, "data.json",),
      JSON.stringify({ folder: normalizedExcalidraw, }, null, 2,),
    );
  }
}
