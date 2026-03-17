export interface SharedWidgetRuntimeApi {
  mode: "inline" | "instance" | "shared";
  runQuery: (queryName: string, params?: Record<string, unknown>,) => Promise<Array<Record<string, unknown>>>;
  runMutation: (mutationName: string, params?: Record<string, unknown>,) => Promise<number>;
  refresh: () => void;
  refreshToken: number;
}
