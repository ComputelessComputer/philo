import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  body: string | null;
  downloadAndInstall: (onProgress?: (downloaded: number, total: number) => void) => Promise<void>;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const update = await check();
    if (!update) return null;

    return {
      version: update.version,
      body: update.body ?? null,
      downloadAndInstall: async (onProgress) => {
        let downloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength ?? 0;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              onProgress?.(downloaded, contentLength);
              break;
          }
        });

        await relaunch();
      },
    };
  } catch (err) {
    console.error('Update check failed:', err);
    return null;
  }
}
