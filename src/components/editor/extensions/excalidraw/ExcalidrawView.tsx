import { NodeViewWrapper, } from "@tiptap/react";
import type { NodeViewProps, } from "@tiptap/react";
import { useEffect, useMemo, useState, } from "react";
import { renderExcalidrawToSvgDataUrl, } from "../../../../services/excalidraw";

export function ExcalidrawView({ node, selected, }: NodeViewProps,) {
  const file = String(node.attrs.file ?? "",);
  const path = String(node.attrs.path ?? "",);
  const [previewUrl, setPreviewUrl,] = useState<string>("",);
  const [error, setError,] = useState<string>("",);

  const title = useMemo(() => {
    if (!file) return "Excalidraw";
    return file.length > 80 ? `${file.slice(0, 77,)}...` : file;
  }, [file,],);

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setPreviewUrl("",);
      setError("Drawing file not found. Check your Excalidraw folder setting.",);
      return;
    }

    renderExcalidrawToSvgDataUrl(path,)
      .then((dataUrl,) => {
        if (cancelled) return;
        setPreviewUrl(dataUrl,);
        setError("",);
      },)
      .catch((err,) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Could not render this drawing.";
        setPreviewUrl("",);
        setError(msg,);
      },);

    return () => {
      cancelled = true;
    };
  }, [path,],);

  return (
    <NodeViewWrapper className={`excalidraw-node ${selected ? "excalidraw-selected" : ""}`}>
      <div className="excalidraw-container">
        <div className="excalidraw-toolbar" data-drag-handle>
          <span className="excalidraw-title" title={file}>
            {title}
          </span>
        </div>
        {error
          ? (
            <div className="excalidraw-error">
              <p className="excalidraw-error-message">{error}</p>
            </div>
          )
          : previewUrl
          ? (
            <div className="excalidraw-render">
              <img src={previewUrl} alt={file || "Excalidraw drawing"} />
            </div>
          )
          : <div className="excalidraw-loading">Loading drawing…</div>}
      </div>
    </NodeViewWrapper>
  );
}
