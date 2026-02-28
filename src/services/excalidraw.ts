import { exportToSvg, } from "@excalidraw/excalidraw";
import { join, } from "@tauri-apps/api/path";
import { exists, readTextFile, } from "@tauri-apps/plugin-fs";
import { getExcalidrawDir, getJournalDir, } from "./paths";
import { getVaultDirSetting, } from "./settings";

const OBSIDIAN_EMBED_RE = /!\[\[([^[\]]+)\]\]/g;

interface ExcalidrawScene {
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

function isAbsolutePath(path: string,): boolean {
  return path.startsWith("/",) || /^[A-Za-z]:[\\/]/.test(path,);
}

function escapeAttr(s: string,): string {
  return s
    .replace(/&/g, "&amp;",)
    .replace(/"/g, "&quot;",)
    .replace(/</g, "&lt;",)
    .replace(/>/g, "&gt;",);
}

function normalizeEmbedTarget(target: string,): string {
  const [pathOnly,] = target.split("|", 1,);
  const trimmed = pathOnly.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(".excalidraw",) || lower.endsWith(".excalidraw.md",)) {
    return trimmed;
  }
  return `${trimmed}.excalidraw`;
}

function getEmbedTargetVariants(target: string,): string[] {
  const normalized = normalizeEmbedTarget(target,);
  if (!normalized) return [];

  const lower = normalized.toLowerCase();
  if (lower.endsWith(".excalidraw.md",)) {
    return [normalized, normalized.slice(0, -3,),];
  }
  if (lower.endsWith(".excalidraw",)) {
    return [normalized, `${normalized}.md`,];
  }
  return [normalized,];
}

function isExcalidrawEmbed(target: string,): boolean {
  const [pathOnly,] = target.split("|", 1,);
  const normalized = pathOnly.trim().toLowerCase();
  return normalized.endsWith(".excalidraw",) || normalized.endsWith(".excalidraw.md",);
}

async function findExistingPath(candidates: string[],): Promise<string | null> {
  for (const candidate of candidates) {
    if (await exists(candidate,)) return candidate;
  }
  return null;
}

function asScene(value: unknown,): ExcalidrawScene | null {
  if (!value || typeof value !== "object") return null;
  const scene = value as Record<string, unknown>;
  if (!Array.isArray(scene.elements,)) return null;
  return {
    elements: scene.elements,
    appState: typeof scene.appState === "object" && scene.appState
      ? (scene.appState as Record<string, unknown>)
      : undefined,
    files: typeof scene.files === "object" && scene.files
      ? (scene.files as Record<string, unknown>)
      : undefined,
  };
}

function parseScene(raw: string,): ExcalidrawScene {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty Excalidraw file.",);
  }

  try {
    const parsed = JSON.parse(trimmed,);
    const scene = asScene(parsed,);
    if (scene) return scene;
  } catch {
    // ignore and continue
  }

  const fencedBlockRe = /```(?:json)?\s*([\s\S]*?)```/g;
  for (const match of trimmed.matchAll(fencedBlockRe,)) {
    try {
      const parsed = JSON.parse(match[1],);
      const scene = asScene(parsed,);
      if (scene) return scene;
    } catch {
      // keep searching
    }
  }

  throw new Error("Could not find a valid Excalidraw scene in this file.",);
}

export async function resolveExcalidrawEmbedPath(target: string,): Promise<string | null> {
  const variants = getEmbedTargetVariants(target,);
  if (variants.length === 0) return null;

  const journalDir = await getJournalDir();
  const vaultDir = await getVaultDirSetting();
  const excalidrawDir = await getExcalidrawDir();
  const candidates = new Set<string>();

  for (const normalized of variants) {
    const basename = normalized.split("/",).filter(Boolean,).pop() ?? normalized;

    if (isAbsolutePath(normalized,)) {
      candidates.add(normalized,);
      continue;
    }

    if (normalized.includes("/",)) {
      if (vaultDir) candidates.add(await join(vaultDir, normalized,),);
      candidates.add(await join(journalDir, normalized,),);
      if (excalidrawDir) candidates.add(await join(excalidrawDir, basename,),);
      continue;
    }

    if (excalidrawDir) candidates.add(await join(excalidrawDir, basename,),);
    if (vaultDir) candidates.add(await join(vaultDir, basename,),);
    candidates.add(await join(journalDir, basename,),);
  }

  return findExistingPath([...candidates,],);
}

export async function resolveExcalidrawEmbeds(markdown: string,): Promise<string> {
  let output = "";
  let lastIndex = 0;

  for (const match of markdown.matchAll(OBSIDIAN_EMBED_RE,)) {
    const fullMatch = match[0];
    const rawTarget = match[1];
    const matchIndex = match.index ?? 0;

    output += markdown.slice(lastIndex, matchIndex,);
    lastIndex = matchIndex + fullMatch.length;

    if (!isExcalidrawEmbed(rawTarget,)) {
      output += fullMatch;
      continue;
    }

    const normalizedTarget = normalizeEmbedTarget(rawTarget,);
    const resolvedPath = await resolveExcalidrawEmbedPath(normalizedTarget,);
    const attrs = [
      'data-excalidraw=""',
      `data-file="${escapeAttr(normalizedTarget,)}"`,
    ];

    if (resolvedPath) {
      attrs.push(`data-path="${escapeAttr(resolvedPath,)}"`,);
    }

    output += `<div ${attrs.join(" ",)}></div>`;
  }

  output += markdown.slice(lastIndex,);
  return output;
}

export async function renderExcalidrawToSvgDataUrl(path: string,): Promise<string> {
  const raw = await readTextFile(path,);
  const scene = parseScene(raw,);
  const svg = await exportToSvg({
    elements: scene.elements as never,
    appState: {
      viewBackgroundColor: "#ffffff",
      exportWithDarkMode: false,
      ...(scene.appState ?? {}),
    } as never,
    files: (scene.files ?? {}) as never,
  },);
  const svgMarkup = new XMLSerializer().serializeToString(svg,);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup,)}`;
}
