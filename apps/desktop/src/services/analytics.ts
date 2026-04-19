import { invoke, } from "@tauri-apps/api/core";

type AnalyticsProperty = boolean | number | string | null | undefined;

export function trackEvent(event: string, properties: Record<string, AnalyticsProperty> = {},) {
  const name = event.trim();
  if (!name) return;

  const payload: Record<string, boolean | number | string | null> = {
    event: name,
  };

  for (const [key, value,] of Object.entries(properties,)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  void invoke("plugin:analytics|event", { payload, },).catch((error,) => {
    if (import.meta.env.DEV) {
      console.warn("Analytics event failed:", error,);
    }
  },);
}
