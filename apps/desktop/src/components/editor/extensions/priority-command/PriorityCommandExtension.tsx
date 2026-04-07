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
import { ArrowDown, ArrowUp, Flame, Minus, } from "lucide-react";
import { forwardRef, useImperativeHandle, useState, } from "react";

type PriorityLevel = "urgent" | "high" | "mid" | "low";

interface PriorityItem {
  detail: string;
  id: PriorityLevel;
  label: PriorityLevel;
  level: PriorityLevel;
  tag: `#${PriorityLevel}`;
}

const PRIORITY_ITEMS: PriorityItem[] = [
  {
    id: "urgent",
    label: "urgent",
    level: "urgent",
    tag: "#urgent",
    detail: "Needs action now",
  },
  {
    id: "high",
    label: "high",
    level: "high",
    tag: "#high",
    detail: "Important this cycle",
  },
  {
    id: "mid",
    label: "mid",
    level: "mid",
    tag: "#mid",
    detail: "Default working priority",
  },
  {
    id: "low",
    label: "low",
    level: "low",
    tag: "#low",
    detail: "Can wait",
  },
];

function findPriorityItems(query: string,) {
  const normalized = query.trim().toLowerCase();
  return PRIORITY_ITEMS.filter((item,) => item.label.startsWith(normalized,));
}

function isInsideTaskItem(state: Parameters<NonNullable<SuggestionOptions["allow"]>>[0]["state"],) {
  const { $from, } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth,).type.name === "taskItem") {
      return true;
    }
  }

  return false;
}

type PriorityMenuProps = {
  command: (item: PriorityItem,) => void;
  items: PriorityItem[];
};

const PriorityMenu = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent; },) => boolean; },
  PriorityMenuProps
>(function PriorityMenu({ items, command, }, ref,) {
  const [selectedIndex, setSelectedIndex,] = useState(0,);
  const boundedIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1,) : 0;

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
        const item = items[boundedIndex];
        if (item) {
          command(item,);
          return true;
        }
      }

      return false;
    },
  }), [boundedIndex, command, items,],);

  if (items.length === 0) return null;

  return (
    <div className="mention-menu">
      <div className="mention-menu-items">
        {items.map((item, index,) => {
          const Icon = item.level === "urgent"
            ? Flame
            : item.level === "high"
            ? ArrowUp
            : item.level === "mid"
            ? Minus
            : ArrowDown;

          return (
            <button
              key={item.id}
              className={`mention-menu-item ${index === boundedIndex ? "is-selected" : ""}`}
              data-priority-level={item.level}
              onClick={() => {
                command(item,);
              }}
              onMouseDown={(event,) => {
                event.preventDefault();
              }}
              type="button"
            >
              <Icon className="mention-menu-icon" size={14} />
              <span className="mention-menu-copy">
                <span className="mention-menu-label">{item.label}</span>
                <span className="mention-menu-detail">{item.detail}</span>
              </span>
            </button>
          );
        },)}
      </div>
    </div>
  );
},);

export const PriorityCommandExtension = Extension.create({
  name: "priorityCommand",

  addProseMirrorPlugins() {
    const suggestion: SuggestionOptions<PriorityItem> = {
      editor: this.editor,
      char: "#",
      allowSpaces: false,
      allowedPrefixes: null,
      pluginKey: new PluginKey("priority-command",),
      allow: ({ state, range, },) => {
        if (!state.selection.empty || !isInsideTaskItem(state,)) return false;

        const { $from, } = state.selection;
        if ($from.parent.type.spec.code) return false;
        if ($from.marks().some((mark,) => mark.type.name === "link")) return false;

        const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc",);
        const hashOffset = Math.max(0, range.from - $from.start(),);
        const charBeforeHash = textBefore.slice(Math.max(0, hashOffset - 1,), hashOffset,);
        if (charBeforeHash && !/[\s([{]/.test(charBeforeHash,)) {
          return false;
        }

        const activeText = textBefore.slice(hashOffset,);
        const match = /^#([a-z]*)$/i.exec(activeText,);
        if (!match) return false;

        return findPriorityItems(match[1] ?? "",).length > 0;
      },
      items: ({ query, },) => findPriorityItems(query,),
      command: ({ editor, range, props, },) => {
        const item = props as PriorityItem;
        editor.chain().focus().insertContentAt(range, {
          type: "text",
          text: `${item.tag} `,
        },).run();
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
                  const maxHeight = `${Math.max(availableHeight, 0,)}px`;
                  const maxWidth = `${Math.max(availableWidth, 0,)}px`;
                  elements.floating.style.maxHeight = maxHeight;
                  elements.floating.style.maxWidth = maxWidth;

                  const popoverRoot = elements.floating.firstElementChild;
                  if (popoverRoot instanceof HTMLElement) {
                    popoverRoot.style.maxHeight = maxHeight;
                    popoverRoot.style.maxWidth = maxWidth;
                  }
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
            renderer = new ReactRenderer(PriorityMenu, {
              props: {
                items: props.items as PriorityItem[],
                command: (item: PriorityItem,) => {
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
              zIndex: "60",
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
              items: props.items as PriorityItem[],
              command: (item: PriorityItem,) => {
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
