import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export function WidgetView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { html, saved, prompt, loading } = node.attrs;

  if (loading) {
    return (
      <NodeViewWrapper className="widget-node">
        <div className="widget-container widget-loading">
          <div className="widget-loading-inner">
            <div className="widget-spinner" />
            <span className="widget-loading-text">Building widget...</span>
            <span className="widget-loading-prompt">{prompt}</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={`widget-node ${selected ? 'widget-selected' : ''}`}>
      <div className="widget-container">
        <div className="widget-toolbar">
          <span className="widget-prompt" title={prompt}>
            {prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt}
          </span>
          <div className="widget-actions">
            <button
              className={`widget-btn ${saved ? 'widget-btn-saved' : ''}`}
              onClick={() => updateAttributes({ saved: !saved })}
            >
              {saved ? '✓ Saved' : 'Save to Library'}
            </button>
            <button className="widget-btn widget-btn-delete" onClick={deleteNode}>
              ✕
            </button>
          </div>
        </div>
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="widget-iframe"
          title="Widget"
        />
      </div>
    </NodeViewWrapper>
  );
}
