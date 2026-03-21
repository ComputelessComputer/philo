import {
  autoUpdate,
  computePosition,
  flip,
  limitShift,
  offset,
  shift,
  size,
  type VirtualElement,
} from "@floating-ui/dom";
import { Extension, } from "@tiptap/core";
import { PluginKey, } from "@tiptap/pm/state";
import { ReactRenderer, } from "@tiptap/react";
import Suggestion, { type SuggestionOptions, } from "@tiptap/suggestion";
import { FilePlus2, } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState, } from "react";

interface SlashCommandItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  run: () => void;
}

const SlashCommandMenu = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent; },) => boolean; },
  { items: SlashCommandItem[]; command: (item: SlashCommandItem,) => void; }
>(function SlashCommandMenu({ items, command, }, ref,) {
  const [selectedIndex, setSelectedIndex,] = useState(0,);

  useEffect(() => {
    setSelectedIndex(0,);
  }, [items,],);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event, },) => {
      if (items.length === 0) return false;

      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
      }

      if (event.key === "ArrowUp") {
        setSelectedIndex((current,) => (current + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((current,) => (current + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item,);
          return true;
        }
      }

      return false;
    },
  }), [items, selectedIndex, command,],);

  if (items.length === 0) {
    return (
      <div className="slash-menu">
        <div className="slash-menu-empty">No matching commands</div>
      </div>
    );
  }

  return (
    <div className="slash-menu">
      <div className="slash-menu-items">
        {items.map((item, index,) => (
          <button
            key={item.id}
            type="button"
            onClick={() => command(item,)}
            className={`slash-menu-item ${index === selectedIndex ? "is-selected" : ""}`}
          >
            <FilePlus2 className="slash-menu-icon" size={15} />
            <span className="slash-menu-copy">
              <span className="slash-menu-title">{item.title}</span>
              <span className="slash-menu-subtitle">{item.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
},);

export const SlashCommandExtension = Extension.create<{
  onAttachPage?: () => void;
}>({
  name: "pageSlashCommand",

  addOptions() {
    return {
      onAttachPage: undefined,
    };
  },

  addProseMirrorPlugins() {
    const suggestion: SuggestionOptions<SlashCommandItem> = {
      editor: this.editor,
      char: "/",
      allowedPrefixes: null,
      startOfLine: false,
      pluginKey: new PluginKey("page-slash-command",),
      allow: ({ state, range, },) => {
        if (!state.selection.empty) return false;

        const $from = state.selection.$from;
        if ($from.parent.type.spec.code) return false;

        const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc",);
        const activeText = textBefore.slice(Math.max(0, range.from - $from.start(),),);

        return /(?:^|\s)\/[^\s/]*$/.test(activeText,);
      },
      items: ({ query, },) => {
        if (!this.options.onAttachPage) return [];

        const normalizedQuery = query.trim().toLowerCase();
        const items: SlashCommandItem[] = [
          {
            id: "attach-page",
            title: "Attach page",
            subtitle: "Create a page attached to this daily note",
            keywords: ["page", "attach", "meeting", "note",],
            run: () => {
              this.options.onAttachPage?.();
            },
          },
        ];

        if (!normalizedQuery) return items;
        return items.filter((item,) =>
          item.title.toLowerCase().includes(normalizedQuery,)
          || item.subtitle.toLowerCase().includes(normalizedQuery,)
          || item.keywords.some((keyword,) => keyword.includes(normalizedQuery,))
        );
      },
      command: ({ editor, range, props, },) => {
        const item = props as SlashCommandItem;
        editor.chain().focus().deleteRange(range,).run();
        item.run();
      },
      render: () => {
        let renderer: ReactRenderer;
        let cleanup: (() => void) | undefined;
        let floatingEl: HTMLElement;
        let referenceEl: VirtualElement | null = null;

        const update = () => {
          if (!referenceEl) return;
          void computePosition(referenceEl, floatingEl, {
            strategy: "fixed",
            placement: "bottom-start",
            middleware: [
              offset(6,),
              flip({ padding: 8, },),
              shift({ padding: 8, limiter: limitShift(), },),
              size({
                padding: 8,
                apply: ({ availableHeight, availableWidth, elements, },) => {
                  elements.floating.style.maxHeight = `${Math.max(availableHeight, 0,)}px`;
                  elements.floating.style.maxWidth = `${Math.max(availableWidth, 0,)}px`;
                },
              },),
            ],
          },).then(({ x, y, },) => {
            Object.assign(floatingEl.style, {
              left: `${x}px`,
              top: `${y}px`,
            },);
          },);
        };

        return {
          onStart: (props,) => {
            renderer = new ReactRenderer(SlashCommandMenu, {
              props: {
                items: props.items as SlashCommandItem[],
                command: (item: SlashCommandItem,) => {
                  props.command(item,);
                },
              },
              editor: props.editor,
            },);

            floatingEl = renderer.element as HTMLElement;
            Object.assign(floatingEl.style, {
              position: "fixed",
              top: "0",
              left: "0",
              zIndex: "40",
            },);
            document.body.appendChild(floatingEl,);

            if (!props.clientRect) return;

            referenceEl = {
              getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
            };

            cleanup = autoUpdate(referenceEl, floatingEl, update,);
            update();
          },
          onUpdate: (props,) => {
            renderer.updateProps({
              items: props.items as SlashCommandItem[],
              command: (item: SlashCommandItem,) => {
                props.command(item,);
              },
            },);

            if (props.clientRect && referenceEl) {
              referenceEl.getBoundingClientRect = () => props.clientRect?.() ?? new DOMRect();
            }
            update();
          },
          onKeyDown: (props,) => {
            if (props.event.key === "Escape") {
              cleanup?.();
              floatingEl.remove();
              return true;
            }

            return ((renderer.ref as { onKeyDown?: (input: { event: KeyboardEvent; },) => boolean; } | null)
              ?.onKeyDown?.({ event: props.event, },) ?? false);
          },
          onExit: () => {
            cleanup?.();
            floatingEl.remove();
            renderer.destroy();
          },
        };
      },
    };

    return [Suggestion(suggestion,),];
  },
},);
