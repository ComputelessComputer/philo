import * as esbuild from "esbuild-wasm";
import wasmUrl from "esbuild-wasm/esbuild.wasm?url";

type CompileRequest = {
  id: string;
  source: string;
};

type CompileResponse = {
  id: string;
  code?: string;
  error?: string;
};

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await esbuild.initialize({
    wasmURL: wasmUrl,
    worker: false,
  },);
  initialized = true;
}

function normalizeCompileError(error: unknown,): string {
  if (!error) return "Compilation failed.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Compilation failed.";
}

self.addEventListener("message", async (event: MessageEvent<CompileRequest>,) => {
  const { id, source, } = event.data;
  try {
    if (/^\s*import\s/m.test(source,)) {
      throw new Error("Code widgets do not support import statements yet. Use the global Philo SDK instead.",);
    }

    await ensureInitialized();
    const result = await esbuild.transform(source, {
      loader: "tsx",
      format: "iife",
      globalName: "__PHILO_WIDGET_MODULE__",
      target: "es2022",
      jsxFactory: "PhiloReact.createElement",
      jsxFragment: "PhiloReact.Fragment",
      sourcemap: "inline",
      sourcefile: "widget.tsx",
    },);
    const response: CompileResponse = {
      id,
      code: result.code,
    };
    self.postMessage(response,);
  } catch (error) {
    const response: CompileResponse = {
      id,
      error: normalizeCompileError(error,),
    };
    self.postMessage(response,);
  }
},);
