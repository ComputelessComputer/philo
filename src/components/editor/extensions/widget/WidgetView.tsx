import { useMemo, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Renderer, JSONUIProvider } from '@json-render/react';
import type { Spec } from '@json-render/core';
import { addToLibrary } from '../../../../services/library';
import { generateWidget } from '../../../../services/generate';
import { registry } from './registry';

class RendererBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('Widget render error:', err, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="widget-error">
          <p className="widget-error-title">Sophia couldn't render this</p>
          <p className="widget-error-message">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Derive a short title from the prompt — first sentence or first ~40 chars.
 */
function deriveTitle(prompt: string): string {
  const firstSentence = prompt.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length <= 40) return firstSentence;
  return firstSentence.slice(0, 37) + '...';
}

export function WidgetView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { spec: specStr, saved, prompt, loading, error } = node.attrs;

  const spec = useMemo<Spec | null>(() => {
    if (!specStr) return null;
    try { return JSON.parse(specStr); } catch { return null; }
  }, [specStr]);

  if (loading) {
    return (
      <NodeViewWrapper className="widget-node">
        <div className="widget-container widget-loading">
          <div className="widget-loading-inner">
            <div className="widget-spinner" />
            <span className="widget-loading-text">Sophia is building...</span>
            <span className="widget-loading-prompt">{prompt}</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const handleRebuild = async () => {
    updateAttributes({ loading: true, spec: '', saved: false, error: '' });
    try {
      const newSpec = await generateWidget(prompt);
      updateAttributes({ spec: JSON.stringify(newSpec), loading: false });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong.';
      const msg = errMsg === 'API_KEY_MISSING'
        ? 'No API key. Add your Anthropic key in Settings (⌘,).'
        : errMsg;
      updateAttributes({ loading: false, error: msg });
    }
  };

  return (
    <NodeViewWrapper className={`widget-node ${selected ? 'widget-selected' : ''}`}>
      <div className="widget-container">
        <div className="widget-toolbar">
          <span className="widget-prompt" title={prompt}>
            {prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt}
          </span>
          <div className="widget-actions">
            <button className="widget-btn widget-btn-rebuild" onClick={handleRebuild}>
              Rebuild
            </button>
            <button
              className={`widget-btn ${saved ? 'widget-btn-saved' : ''}`}
              onClick={async () => {
                if (!saved && specStr) {
                  await addToLibrary({
                    title: deriveTitle(prompt),
                    description: prompt,
                    html: specStr,
                    prompt,
                  });
                  updateAttributes({ saved: true });
                }
              }}
              disabled={saved || !specStr}
            >
              {saved ? '✓ Saved' : 'Save to Library'}
            </button>
            <button className="widget-btn widget-btn-delete" onClick={deleteNode}>
              ✕
            </button>
          </div>
        </div>

        {/* Render content */}
        {error ? (
          <div className="widget-error">
            <p className="widget-error-title">Sophia couldn't build this</p>
            <p className="widget-error-message">{error}</p>
          </div>
        ) : spec ? (
          <div className="widget-render">
            <RendererBoundary>
              <JSONUIProvider registry={registry}>
                <Renderer spec={spec} registry={registry} />
              </JSONUIProvider>
            </RendererBoundary>
          </div>
        ) : (
          <div className="widget-error">
            <p className="widget-error-message">No content yet.</p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
