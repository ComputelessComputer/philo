import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import type { SharedWidgetRuntimeApi, } from "../runtime";
import { buildCodeWidgetSandboxUrl, compileCodeWidgetSource, } from "./compiler";
import {
  CODE_WIDGET_LOAD,
  CODE_WIDGET_READY,
  CODE_WIDGET_RESIZE,
  CODE_WIDGET_STORAGE_REQUEST,
  CODE_WIDGET_STORAGE_RESPONSE,
  type CodeWidgetReadyMessage,
  type CodeWidgetResizeMessage,
  type CodeWidgetStorageRequestMessage,
  isCodeWidgetMessage,
} from "./messages";

function WidgetError({ title, message, }: { title: string; message: string; },) {
  return (
    <div className="widget-error">
      <p className="widget-error-title">{title}</p>
      <p className="widget-error-message">{message}</p>
    </div>
  );
}

export function CodeWidgetRenderer({
  id,
  runtime,
  source,
}: {
  id: string;
  runtime: SharedWidgetRuntimeApi;
  source: string;
},) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null,);
  const frameId = useMemo(() => crypto.randomUUID(), [],);
  const sandboxUrl = useMemo(() => buildCodeWidgetSandboxUrl(frameId,), [frameId,],);
  const [compiledCode, setCompiledCode,] = useState<string | null>(null,);
  const [compileError, setCompileError,] = useState<string | null>(null,);
  const [frameReady, setFrameReady,] = useState(false,);
  const [height, setHeight,] = useState(220,);

  const postLoadMessage = useCallback(() => {
    if (!compiledCode) return;
    iframeRef.current?.contentWindow?.postMessage({
      type: CODE_WIDGET_LOAD,
      frameId,
      code: compiledCode,
    }, "*",);
  }, [compiledCode, frameId,],);

  useEffect(() => {
    let active = true;
    setCompiledCode(null,);
    setCompileError(null,);
    void compileCodeWidgetSource(source,)
      .then(({ code, },) => {
        if (!active) return;
        setCompiledCode(code,);
      },)
      .catch((error,) => {
        if (!active) return;
        setCompileError(error instanceof Error ? error.message : "Compilation failed.",);
      },);
    return () => {
      active = false;
    };
  }, [source,],);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent<unknown>,) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isCodeWidgetMessage(event.data,)) return;
      if (event.data.frameId !== frameId) return;

      if (event.data.type === CODE_WIDGET_READY) {
        const message = event.data as CodeWidgetReadyMessage;
        if (message.frameId !== frameId) return;
        setFrameReady(true,);
        postLoadMessage();
        return;
      }

      if (event.data.type === CODE_WIDGET_RESIZE) {
        const message = event.data as CodeWidgetResizeMessage;
        setHeight(Math.max(120, message.height,),);
        return;
      }

      if (event.data.type !== CODE_WIDGET_STORAGE_REQUEST) {
        return;
      }

      const message = event.data as CodeWidgetStorageRequestMessage;

      try {
        const result = message.action === "query"
          ? await runtime.runQuery(message.name, message.params,)
          : await runtime.runMutation(message.name, message.params,);
        iframeRef.current?.contentWindow?.postMessage({
          type: CODE_WIDGET_STORAGE_RESPONSE,
          frameId,
          requestId: message.requestId,
          ok: true,
          result,
        }, "*",);
      } catch (error) {
        iframeRef.current?.contentWindow?.postMessage({
          type: CODE_WIDGET_STORAGE_RESPONSE,
          frameId,
          requestId: message.requestId,
          ok: false,
          error: error instanceof Error ? error.message : "Request failed.",
        }, "*",);
      }
    };

    window.addEventListener("message", handleMessage,);
    return () => window.removeEventListener("message", handleMessage,);
  }, [frameId, postLoadMessage, runtime,],);

  useEffect(() => {
    if (!compiledCode || !frameReady) return;
    postLoadMessage();
  }, [compiledCode, frameReady, postLoadMessage,],);

  if (compileError) {
    return <WidgetError title="Code widget failed" message={compileError} />;
  }

  return (
    <div className="widget-render">
      <iframe
        ref={iframeRef}
        title={`code-widget-${id}`}
        src={sandboxUrl}
        sandbox="allow-scripts"
        onLoad={() => setFrameReady(true,)}
        style={{
          width: "100%",
          height: `${height}px`,
          border: "none",
          display: "block",
          background: "#fff",
        }}
      />
      {!compiledCode && <WidgetError title="Compiling widget" message="Preparing the code runtime." />}
    </div>
  );
}
