import { createAnthropic, } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, } from "@ai-sdk/google";
import { createOpenAI, } from "@ai-sdk/openai";
import { createOpenAICompatible, } from "@ai-sdk/openai-compatible";
import { Channel, invoke, } from "@tauri-apps/api/core";
import type { LanguageModel, } from "ai";
import type { ActiveAiConfig, AiProvider, } from "./settings";

interface StreamHttpInput {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

type StreamHttpEvent =
  | {
    type: "start";
    status: number;
    headers: Array<[string, string,]>;
  }
  | {
    type: "chunk";
    data: number[];
  }
  | {
    type: "end";
  }
  | {
    type: "error";
    message: string;
  };

function createAbortError() {
  return new DOMException("AI request cancelled.", "AbortError",);
}

async function toStreamHttpInput(input: RequestInfo | URL, init?: RequestInit,): Promise<{
  request: Request;
  payload: StreamHttpInput;
}> {
  const request = new Request(input, init,);
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD"
    ? null
    : await request.text();

  return {
    request,
    payload: {
      requestId: crypto.randomUUID(),
      url: request.url,
      method,
      headers: Object.fromEntries(request.headers.entries(),),
      body: body && body.length > 0 ? body : null,
    },
  };
}

export async function tauriStreamFetch(input: RequestInfo | URL, init?: RequestInit,) {
  const { request, payload, } = await toStreamHttpInput(input, init,);
  const signal = request.signal;

  if (signal.aborted) {
    throw createAbortError();
  }

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let settled = false;
  let responseStarted = false;

  return await new Promise<Response>((resolve, reject,) => {
    const stream = new ReadableStream<Uint8Array>({
      start(nextController,) {
        controller = nextController;
      },
      cancel() {
        void invoke("cancel_http_stream", {
          requestId: payload.requestId,
        },).catch(() => undefined);
      },
    },);

    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort,);
    };

    const fail = (error: unknown,) => {
      if (settled) return;
      settled = true;
      cleanup();

      const normalized = error instanceof Error ? error : new Error(String(error,),);
      if (!responseStarted) {
        reject(normalized,);
        return;
      }

      controller?.error(normalized,);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      controller?.close();
    };

    const handleAbort = () => {
      const error = createAbortError();
      void invoke("cancel_http_stream", {
        requestId: payload.requestId,
      },).catch(() => undefined);

      if (settled) return;
      settled = true;
      cleanup();

      if (!responseStarted) {
        reject(error,);
        return;
      }

      controller?.error(error,);
    };

    signal.addEventListener("abort", handleAbort, { once: true, },);

    const channel = new Channel<StreamHttpEvent>();
    channel.onmessage = (event,) => {
      if (settled && event.type !== "start") return;

      switch (event.type) {
        case "start":
          if (responseStarted) return;
          responseStarted = true;
          resolve(
            new Response(stream, {
              status: event.status,
              headers: event.headers,
            },),
          );
          return;
        case "chunk":
          controller?.enqueue(new Uint8Array(event.data,),);
          return;
        case "end":
          finish();
          return;
        case "error":
          fail(new Error(event.message,),);
      }
    };

    void invoke("stream_http", {
      input: payload,
      onEvent: channel,
    },).catch(fail,);
  },);
}

function getModelId(provider: AiProvider, purpose: "assistant" | "widget",) {
  switch (provider) {
    case "anthropic":
      return purpose === "assistant" ? "claude-sonnet-4-5" : "claude-opus-4-6";
    case "openai":
      return "gpt-4.1";
    case "google":
      return "gemini-2.0-flash";
    case "openrouter":
      return "openai/gpt-4.1";
  }
}

export function getAiSdkModel(
  config: ActiveAiConfig,
  purpose: "assistant" | "widget",
): LanguageModel {
  const modelId = getModelId(config.provider, purpose,);

  switch (config.provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: config.apiKey,
        fetch: tauriStreamFetch,
      },)(modelId,);
    case "openai":
      return createOpenAI({
        apiKey: config.apiKey,
        fetch: tauriStreamFetch,
      },)(modelId,);
    case "google":
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
        fetch: tauriStreamFetch,
      },)(modelId,);
    case "openrouter":
      return createOpenAICompatible({
        name: "openrouter",
        apiKey: config.apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": "https://philo.app",
          "X-Title": "Philo",
        },
        fetch: tauriStreamFetch,
      },)(modelId,);
  }
}
