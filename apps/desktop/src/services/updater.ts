import { relaunch as tauriRelaunch, } from "@tauri-apps/plugin-process";
import { check, } from "@tauri-apps/plugin-updater";

const RELEASE_URL_PREFIX = "https://github.com/ComputelessComputer/philo/releases/tag";

export interface UpdateInfo {
  version: string;
  body: string | null;
  releaseUrl: string;
  downloadAndInstall: (onProgress?: (downloaded: number, total: number,) => void,) => Promise<void>;
}

export function relaunch() {
  tauriRelaunch();
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const update = await check();
    if (!update) return null;

    return {
      version: update.version,
      body: update.body ?? null,
      releaseUrl: `${RELEASE_URL_PREFIX}/v${update.version}`,
      downloadAndInstall: async (onProgress,) => {
        let downloaded = 0;
        let contentLength = 0;

        await update.downloadAndInstall((event,) => {
          switch (event.event) {
            case "Started":
              contentLength = event.data.contentLength ?? 0;
              break;
            case "Progress":
              downloaded += event.data.chunkLength;
              onProgress?.(downloaded, contentLength,);
              break;
          }
        },);
      },
    };
  } catch (err) {
    console.error("Update check failed:", err,);
    return null;
  }
}
