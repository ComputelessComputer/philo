import { Check, X, } from "lucide-react";
import { AiDiffPreview, } from "../../../ai/AiDiffPreview";

interface WidgetEditPreviewPanelProps {
  unifiedDiff: string;
  applying: boolean;
  onApply: () => void;
  onDecline: () => void;
}

export function WidgetEditPreviewPanel({
  unifiedDiff,
  applying,
  onApply,
  onDecline,
}: WidgetEditPreviewPanelProps,) {
  return (
    <div className="widget-history-panel" onMouseDown={(event,) => event.stopPropagation()}>
      <div className="widget-history-header">
        <div>
          <p className="widget-history-eyebrow">Pending edit</p>
          <p className="widget-history-title">Review widget changes</p>
        </div>
      </div>

      <div className="widget-history-diff widget-edit-preview-diff">
        <div className="widget-history-actions">
          <button
            type="button"
            className="widget-btn widget-history-restore"
            onClick={onApply}
            disabled={applying}
            title="Apply this widget edit"
          >
            <Check strokeWidth={2} />
            <span>{applying ? "Applying…" : "Apply"}</span>
          </button>
          <button
            type="button"
            className="widget-btn widget-edit-preview-decline"
            onClick={onDecline}
            disabled={applying}
            title="Decline this widget edit"
          >
            <X strokeWidth={2} />
            <span>Decline</span>
          </button>
        </div>
        <AiDiffPreview unifiedDiff={unifiedDiff} />
      </div>
    </div>
  );
}
