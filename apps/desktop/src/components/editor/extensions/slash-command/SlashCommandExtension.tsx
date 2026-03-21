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
import { CalendarDays, FilePlus2, } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState, } from "react";
import { createDateMention, createRecurringMention, type MentionSuggestion, } from "../../../../services/mentions";
import { getToday, } from "../../../../types/note";

interface SlashCommandItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  action: "attach_page" | "open_date_picker";
}

function MiniCalendar({ selected, onSelect, }: { selected: string; onSelect: (date: string,) => void; },) {
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1,).padStart(2, "0",)}-${
      String(d.getDate(),).padStart(2, "0",)
    }`;
  })();
  const init = selected ? new Date(`${selected}T00:00:00`,) : new Date();
  const [viewYear, setViewYear,] = useState(init.getFullYear(),);
  const [viewMonth, setViewMonth,] = useState(init.getMonth(),);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0,).getDate();
  const firstDay = (new Date(viewYear, viewMonth, 1,).getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null,);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d,);

  const pad = (n: number,) => String(n,).padStart(2, "0",);
  const toIso = (day: number,) => `${viewYear}-${pad(viewMonth + 1,)}-${pad(day,)}`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y,) => y - 1);
      setViewMonth(11,);
    } else setViewMonth((m,) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y,) => y + 1);
      setViewMonth(0,);
    } else setViewMonth((m,) => m + 1);
  };

  const title = new Date(viewYear, viewMonth, 1,).toLocaleDateString("en-US", { month: "long", year: "numeric", },);

  return (
    <div className="mention-calendar">
      <div className="mention-calendar-header">
        <button className="mention-calendar-nav" onClick={prevMonth} type="button">‹</button>
        <span className="mention-calendar-title">{title}</span>
        <button className="mention-calendar-nav" onClick={nextMonth} type="button">›</button>
      </div>
      <div className="mention-calendar-weekdays">
        {["M", "T", "W", "T", "F", "S", "S",].map((d, i,) => (
          <span key={i} className="mention-calendar-weekday">{d}</span>
        ))}
      </div>
      <div className="mention-calendar-grid">
        {cells.map((day, i,) => {
          if (day === null) return <span key={i} className="mention-calendar-cell mention-calendar-empty" />;
          const iso = toIso(day,);
          return (
            <button
              key={i}
              className={`mention-calendar-cell${iso === todayStr ? " is-today" : ""}${
                iso === selected ? " is-selected" : ""
              }`}
              onClick={() => onSelect(iso,)}
              type="button"
            >
              {day}
            </button>
          );
        },)}
      </div>
    </div>
  );
}

const SlashCommandMenu = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent; },) => boolean; },
  {
    items: SlashCommandItem[];
    insertMention: (items: MentionSuggestion[],) => void;
    runCommand: (item: SlashCommandItem,) => void;
  }
>(function SlashCommandMenu({ items, insertMention, runCommand, }, ref,) {
  const [selectedIndex, setSelectedIndex,] = useState(0,);
  const [showDatePicker, setShowDatePicker,] = useState(false,);
  const [selectedDate, setSelectedDate,] = useState(getToday(),);
  const [recurrence, setRecurrence,] = useState("",);

  useEffect(() => {
    setSelectedIndex(0,);
    setShowDatePicker(false,);
  }, [items,],);

  const applyCustomDate = () => {
    if (!selectedDate) return;
    const nextItem = recurrence ? createRecurringMention(selectedDate, recurrence,) : createDateMention(selectedDate,);
    insertMention([nextItem,],);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event, },) => {
      if (showDatePicker) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowDatePicker(false,);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          applyCustomDate();
          return true;
        }
        return false;
      }

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
          if (item.action === "open_date_picker") {
            setShowDatePicker(true,);
          } else {
            runCommand(item,);
          }
          return true;
        }
      }

      return false;
    },
  }), [showDatePicker, items, selectedIndex, selectedDate, recurrence, insertMention, runCommand,],);

  if (!showDatePicker && items.length === 0) {
    return (
      <div className="slash-menu">
        <div className="slash-menu-empty">No matching commands</div>
      </div>
    );
  }

  return (
    <div className="slash-menu">
      {!showDatePicker && (
        <div className="slash-menu-items">
          {items.map((item, index,) => {
            const Icon = item.action === "attach_page" ? FilePlus2 : CalendarDays;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.action === "open_date_picker") {
                    setShowDatePicker(true,);
                    return;
                  }
                  runCommand(item,);
                }}
                className={`slash-menu-item ${index === selectedIndex ? "is-selected" : ""}`}
              >
                <Icon className="slash-menu-icon" size={15} />
                <span className="slash-menu-copy">
                  <span className="slash-menu-title">{item.title}</span>
                  <span className="slash-menu-subtitle">{item.subtitle}</span>
                </span>
              </button>
            );
          },)}
        </div>
      )}
      {showDatePicker && (
        <div className="mention-date-picker">
          <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
          <div className="mention-recurrence">
            <div className="mention-recurrence-label">Repeat</div>
            <div className="mention-recurrence-options">
              {[
                { value: "", label: "None", },
                { value: "daily", label: "Daily", },
                { value: "weekly", label: "Weekly", },
                { value: "monthly", label: "Monthly", },
              ].map((opt,) => (
                <button
                  key={opt.value || "none"}
                  className={`mention-recurrence-option${recurrence === opt.value ? " is-active" : ""}`}
                  onClick={() => setRecurrence(opt.value,)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mention-date-picker-actions">
            <button
              className="mention-date-picker-btn mention-date-picker-btn-muted"
              onClick={() => setShowDatePicker(false,)}
              type="button"
            >
              Back
            </button>
            <button
              className="mention-date-picker-btn"
              disabled={!selectedDate}
              onClick={applyCustomDate}
              type="button"
            >
              Insert
            </button>
          </div>
        </div>
      )}
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
    const insertMentionItems = (
      editor: Parameters<NonNullable<SuggestionOptions["command"]>>[0]["editor"],
      range: Parameters<NonNullable<SuggestionOptions["command"]>>[0]["range"],
      items: MentionSuggestion[],
    ) => {
      const content = items.flatMap((item,) => [
        {
          type: "mentionChip",
          attrs: {
            id: item.id,
            label: item.label,
            kind: item.kind,
          },
        },
        { type: "text", text: " ", },
      ]);

      editor
        .chain()
        .focus()
        .insertContentAt(range, content,)
        .run();
    };

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
        const normalizedQuery = query.trim().toLowerCase();
        const items: SlashCommandItem[] = [
          {
            id: "insert-date-mention",
            title: "Date mention",
            subtitle: "Insert a date or repeating date chip",
            keywords: ["date", "chip", "mention", "deadline", "schedule",],
            action: "open_date_picker",
          },
        ];

        if (this.options.onAttachPage) {
          items.unshift({
            id: "attach-page",
            title: "Attach page",
            subtitle: "Create a page attached to this daily note",
            keywords: ["page", "attach", "meeting", "note",],
            action: "attach_page",
          },);
        }

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
        if (item.action === "attach_page") {
          this.options.onAttachPage?.();
        }
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
                insertMention: (items: MentionSuggestion[],) => {
                  insertMentionItems(props.editor, props.range, items,);
                },
                runCommand: (item: SlashCommandItem,) => {
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
              insertMention: (items: MentionSuggestion[],) => {
                insertMentionItems(props.editor, props.range, items,);
              },
              runCommand: (item: SlashCommandItem,) => {
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
