import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { getAssetsDir, getJournalDir } from './paths';

function generateFilename(ext: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}.${ext}`;
}

/**
 * Save an image file to journal/assets/ and return the relative path
 * suitable for storing in markdown (e.g. "assets/1234567890-abc123.png").
 */
export async function saveImage(file: File): Promise<string> {
  const assetsDir = await getAssetsDir();
  const dirExists = await exists(assetsDir);
  if (!dirExists) {
    await mkdir(assetsDir, { recursive: true });
  }

  const ext = file.name.split('.').pop() || 'png';
  const filename = generateFilename(ext);
  const relativePath = `assets/${filename}`;
  const fullPath = await join(assetsDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  await writeFile(fullPath, uint8Array);

  return relativePath;
}

/**
 * Resolve a relative asset path (e.g. "assets/img.png") to a URL
 * the Tauri webview can display via the asset protocol.
 */
export async function resolveAssetUrl(relativePath: string): Promise<string> {
  const journalDir = await getJournalDir();
  const absolutePath = await join(journalDir, relativePath);
  return convertFileSrc(absolutePath);
}

/**
 * Convert all relative asset paths in markdown to asset:// URLs for display.
 * Matches patterns like ![alt](assets/filename.ext) or ![alt](assets/filename.ext "title")
 */
export async function resolveMarkdownImages(markdown: string): Promise<string> {
  const assetPattern = /!\[([^\]]*)\]\((assets\/[^)\s"]+)(?:\s+"([^"]*)")?\)/g;
  const matches = [...markdown.matchAll(assetPattern)];
  if (matches.length === 0) return markdown;

  const journalDir = await getJournalDir();
  let result = markdown;

  for (const match of matches) {
    const [full, alt, relativePath, title] = match;
    const absolutePath = await join(journalDir, relativePath);
    const assetUrl = convertFileSrc(absolutePath);
    const replacement = title
      ? `![${alt}](${assetUrl} "${title}")`
      : `![${alt}](${assetUrl})`;
    result = result.replace(full, replacement);
  }

  return result;
}

/**
 * Convert all asset:// URLs in markdown back to relative paths for storage.
 * Matches the asset protocol URL pattern and extracts the relative assets/ path.
 */
export function unresolveMarkdownImages(markdown: string): string {
  // Tauri v2 asset URLs look like: http://asset.localhost/path/to/appdata/journal/assets/file.ext
  // or asset://localhost/path/to/appdata/journal/assets/file.ext
  const assetUrlPattern = /!\[([^\]]*)\]\(((?:http:\/\/asset\.localhost|asset:\/\/localhost)[^)\s"]*\/journal\/(assets\/[^)\s"]+))(?:\s+"([^"]*)")?\)/g;

  return markdown.replace(assetUrlPattern, (_full, alt, _url, relativePath, title) => {
    return title
      ? `![${alt}](${relativePath} "${title}")`
      : `![${alt}](${relativePath})`;
  });
}
