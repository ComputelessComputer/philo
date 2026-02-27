import { convertFileSrc, } from "@tauri-apps/api/core";
import { join, } from "@tauri-apps/api/path";
import { exists, mkdir, writeFile, } from "@tauri-apps/plugin-fs";
import { getAssetsDir, getJournalDir, } from "./paths";
import { getAssetsFolderSetting, } from "./settings";

function generateFilename(ext: string,): string {
  const ts = Date.now();
  const rand = Math.random().toString(36,).slice(2, 8,);
  return `${ts}-${rand}.${ext}`;
}

function normalizePathSegment(segment: string,): string {
  return segment.replace(/^\.?\//, "",).replace(/\/$/, "",);
}

async function getAssetsRelativeRoot(): Promise<string> {
  const configured = normalizePathSegment(await getAssetsFolderSetting(),);
  return configured || "assets";
}

/**
 * Save an image file to journal/assets/ and return the relative path
 * suitable for storing in markdown (e.g. "assets/1234567890-abc123.png").
 */
export async function saveImage(file: File,): Promise<string> {
  const assetsDir = await getAssetsDir();
  const assetsRelativeRoot = await getAssetsRelativeRoot();
  const dirExists = await exists(assetsDir,);
  if (!dirExists) {
    await mkdir(assetsDir, { recursive: true, },);
  }

  const ext = file.name.split(".",).pop() || "png";
  const filename = generateFilename(ext,);
  const relativePath = `${assetsRelativeRoot}/${filename}`;
  const fullPath = await join(assetsDir, filename,);

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer,);

  await writeFile(fullPath, uint8Array,);

  return relativePath;
}

/**
 * Resolve a relative asset path (e.g. "assets/img.png") to a URL
 * the Tauri webview can display via the asset protocol.
 */
export async function resolveAssetUrl(relativePath: string,): Promise<string> {
  const journalDir = await getJournalDir();
  const absolutePath = await join(journalDir, relativePath,);
  return convertFileSrc(absolutePath,);
}

/**
 * Convert all relative asset paths in markdown to asset:// URLs for display.
 * Matches patterns like ![alt](assets/filename.ext) or ![alt](assets/filename.ext "title")
 */
export async function resolveMarkdownImages(markdown: string,): Promise<string> {
  const assetsRelativeRoot = await getAssetsRelativeRoot();
  const escapedRoot = assetsRelativeRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&",);
  const assetPattern = new RegExp(
    `!\\[([^\\]]*)\\]\\(((?:\\.\\.?\\/)*${escapedRoot}\\/[^)\\s"]+)(?:\\s+"([^"]*)")?\\)`,
    "g",
  );
  const matches = [...markdown.matchAll(assetPattern,),];
  if (matches.length === 0) return markdown;

  const journalDir = await getJournalDir();
  let result = markdown;

  for (const match of matches) {
    const [full, alt, relativePath, title,] = match;
    const normalizedPath = relativePath.replace(/^(?:\.\.?\/)+/, "",);
    const absolutePath = await join(journalDir, normalizedPath,);
    const assetUrl = convertFileSrc(absolutePath,);
    const replacement = title
      ? `![${alt}](${assetUrl} "${title}")`
      : `![${alt}](${assetUrl})`;
    result = result.replace(full, replacement,);
  }

  return result;
}

/**
 * Convert all asset:// URLs in markdown back to relative paths for storage.
 * Matches the asset protocol URL pattern and extracts the relative assets/ path.
 */
export function unresolveMarkdownImages(markdown: string,): string {
  // Tauri v2 asset URLs look like: http://asset.localhost/path/to/appdata/.../assets/file.ext
  // or asset://localhost/path/to/appdata/.../assets/file.ext
  // Match any asset URL and recover the final "folder/filename" path segment.
  const assetUrlPattern =
    /!\[([^\]]*)\]\(((?:http:\/\/asset\.localhost|asset:\/\/localhost)[^)\s"]+)(?:\s+"([^"]*)")?\)/g;

  return markdown.replace(assetUrlPattern, (_full, alt, url, title,) => {
    let relativePath = "";
    try {
      const parsed = new URL(url,);
      const match = decodeURIComponent(parsed.pathname,).match(/\/([^/]+\/[^/]+)$/,);
      relativePath = match ? match[1] : "";
    } catch {
      const match = String(url,).match(/\/([^/]+\/[^/]+)$/,);
      relativePath = match ? match[1] : "";
    }
    if (!relativePath) {
      return title
        ? `![${alt}](${url} "${title}")`
        : `![${alt}](${url})`;
    }
    return title
      ? `![${alt}](${relativePath} "${title}")`
      : `![${alt}](${relativePath})`;
  },);
}
