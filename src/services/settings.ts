import { join, } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile, } from "@tauri-apps/plugin-fs";
import { getBaseDir, } from "./paths";

export interface Settings {
  anthropicApiKey: string;
  journalDir: string;
  filenamePattern: string;
}

const SETTINGS_FILE = "settings.json";

export const DEFAULT_FILENAME_PATTERN = "{YYYY}-{MM}-{DD}";

const DEFAULT_SETTINGS: Settings = {
  anthropicApiKey: "",
  journalDir: "",
  filenamePattern: "",
};

async function getSettingsPath(): Promise<string> {
  const base = await getBaseDir();
  return await join(base, SETTINGS_FILE,);
}

export async function loadSettings(): Promise<Settings> {
  const path = await getSettingsPath();
  const fileExists = await exists(path,);
  if (!fileExists) return { ...DEFAULT_SETTINGS, };

  try {
    const raw = await readTextFile(path,);
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw,), };
  } catch {
    return { ...DEFAULT_SETTINGS, };
  }
}

export async function saveSettings(settings: Settings,): Promise<void> {
  const base = await getBaseDir();
  const dirExists = await exists(base,);
  if (!dirExists) {
    await mkdir(base, { recursive: true, },);
  }
  const path = await join(base, SETTINGS_FILE,);
  await writeTextFile(path, JSON.stringify(settings, null, 2,),);
}

export async function getApiKey(): Promise<string> {
  const settings = await loadSettings();
  return settings.anthropicApiKey;
}

export async function setApiKey(key: string,): Promise<void> {
  const settings = await loadSettings();
  settings.anthropicApiKey = key;
  await saveSettings(settings,);
}

export async function getJournalDirSetting(): Promise<string> {
  const settings = await loadSettings();
  return settings.journalDir;
}

export async function getFilenamePattern(): Promise<string> {
  const settings = await loadSettings();
  return settings.filenamePattern || DEFAULT_FILENAME_PATTERN;
}
