import { CODE_WIDGET_FRAME_PARAM, CODE_WIDGET_QUERY_PARAM, } from "./messages";

type CompileResponse = {
  id: string;
  code?: string;
  error?: string;
};

const worker = new Worker(new URL("./compiler.worker.ts", import.meta.url,), { type: "module", },);
const pending = new Map<string, { resolve: (code: string,) => void; reject: (error: Error,) => void; }>();
const cache = new Map<string, Promise<string>>();

worker.addEventListener("message", (event: MessageEvent<CompileResponse>,) => {
  const response = event.data;
  const entry = pending.get(response.id,);
  if (!entry) return;
  pending.delete(response.id,);
  if (response.error) {
    entry.reject(new Error(response.error,),);
    return;
  }
  entry.resolve(response.code ?? "",);
},);

async function hashSource(source: string,) {
  const bytes = new TextEncoder().encode(source,);
  const digest = await crypto.subtle.digest("SHA-256", bytes,);
  return Array.from(new Uint8Array(digest,), (byte,) => byte.toString(16,).padStart(2, "0",),).join("",);
}

async function requestCompile(source: string,): Promise<string> {
  const id = crypto.randomUUID();
  return await new Promise<string>((resolve, reject,) => {
    pending.set(id, { resolve, reject, },);
    worker.postMessage({ id, source, },);
  },);
}

export async function compileCodeWidgetSource(source: string,): Promise<{ hash: string; code: string; }> {
  const hash = await hashSource(`code-widget:v1:${source}`,);
  const existing = cache.get(hash,);
  if (existing) {
    return { hash, code: await existing, };
  }

  const request = requestCompile(source,);
  cache.set(hash, request,);

  try {
    return { hash, code: await request, };
  } catch (error) {
    cache.delete(hash,);
    throw error;
  }
}

export function buildCodeWidgetSandboxUrl(frameId: string,): string {
  const url = new URL(window.location.href,);
  url.search = "";
  url.hash = "";
  url.searchParams.set(CODE_WIDGET_QUERY_PARAM, "1",);
  url.searchParams.set(CODE_WIDGET_FRAME_PARAM, frameId,);
  return url.toString();
}
