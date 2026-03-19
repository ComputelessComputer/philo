import { invoke, } from "@tauri-apps/api/core";

export async function buildUnifiedDiff(before: string, after: string,) {
  return await invoke<string>("build_unified_diff", { before, after, },);
}
