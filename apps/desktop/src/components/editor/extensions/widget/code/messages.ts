export const CODE_WIDGET_READY = "philo:code-widget-ready";
export const CODE_WIDGET_LOAD = "philo:code-widget-load";
export const CODE_WIDGET_STORAGE_REQUEST = "philo:code-widget-storage-request";
export const CODE_WIDGET_STORAGE_RESPONSE = "philo:code-widget-storage-response";
export const CODE_WIDGET_RESIZE = "philo:code-widget-resize";
export const CODE_WIDGET_QUERY_PARAM = "widgetSandbox";
export const CODE_WIDGET_FRAME_PARAM = "widgetFrame";

export interface CodeWidgetReadyMessage {
  type: typeof CODE_WIDGET_READY;
  frameId: string;
}

export interface CodeWidgetLoadMessage {
  type: typeof CODE_WIDGET_LOAD;
  frameId: string;
  code: string;
}

export interface CodeWidgetResizeMessage {
  type: typeof CODE_WIDGET_RESIZE;
  frameId: string;
  height: number;
}

export interface CodeWidgetStorageRequestMessage {
  type: typeof CODE_WIDGET_STORAGE_REQUEST;
  frameId: string;
  requestId: string;
  action: "query" | "mutation";
  name: string;
  params: Record<string, unknown>;
}

export interface CodeWidgetStorageResponseMessage {
  type: typeof CODE_WIDGET_STORAGE_RESPONSE;
  frameId: string;
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type CodeWidgetMessage =
  | CodeWidgetLoadMessage
  | CodeWidgetReadyMessage
  | CodeWidgetResizeMessage
  | CodeWidgetStorageRequestMessage
  | CodeWidgetStorageResponseMessage;

export function isCodeWidgetMessage(value: unknown,): value is CodeWidgetMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; frameId?: unknown; };
  return typeof candidate.type === "string" && typeof candidate.frameId === "string";
}
