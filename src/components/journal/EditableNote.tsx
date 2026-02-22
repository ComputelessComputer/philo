import { openUrl, } from "@tauri-apps/plugin-opener";
import type { Editor as TiptapEditor, } from "@tiptap/core";
import FileHandler from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow, } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { Plugin, PluginKey, } from "@tiptap/pm/state";
import { EditorContent, useEditor, } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useRef, } from "react";
import { useDebounceCallback, } from "usehooks-ts";
import "../editor/Editor.css";
import { json2md, md2json, } from "../../lib/markdown";
import { resolveAssetUrl, saveImage, } from "../../services/images";
import { saveDailyNote, } from "../../services/storage";
import type { DailyNote, } from "../../types/note";
import { EditorBubbleMenu, } from "../editor/EditorBubbleMenu";
import { ClipboardTextSerializer, } from "../editor/extensions/clipboard";
import { HashtagExtension, } from "../editor/extensions/hashtag/HashtagExtension";
import { CustomListKeymap, } from "../editor/extensions/list-keymap";
import { CustomTaskItem, } from "../editor/extensions/task-item/TaskItemNode";
import { WidgetExtension, } from "../editor/extensions/widget/WidgetExtension";

export interface EditableNoteHandle {
  focus(): void;
  editor: TiptapEditor | null;
}

interface EditableNoteProps {
  note: DailyNote;
  placeholder?: string;
  onSave?: (note: DailyNote,) => void;
}

const EditableNote = forwardRef<EditableNoteHandle, EditableNoteProps>(
  function EditableNote({ note, placeholder = "Start writing...", onSave, }, ref,) {
    const noteRef = useRef(note,);
    noteRef.current = note;

    const onSaveRef = useRef(onSave,);
    onSaveRef.current = onSave;

    const saveDebounced = useDebounceCallback((markdown: string,) => {
      const updated = { ...noteRef.current, content: markdown, };
      if (onSaveRef.current) {
        onSaveRef.current(updated,);
      } else {
        saveDailyNote(updated,).catch(console.error,);
      }
    }, 500,);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6,], },
          listKeymap: false,
        },),
        Image.configure({ inline: true, allowBase64: false, },),
        Underline,
        Placeholder.configure({ placeholder, },),
        Link.extend({
          inclusive() {
            return false;
          },
          addProseMirrorPlugins() {
            return [
              new Plugin({
                key: new PluginKey("linkCmdClick",),
                props: {
                  handleClick(_view, _pos, event,) {
                    if (!(event.metaKey || event.ctrlKey)) return false;
                    const anchor = (event.target as HTMLElement).closest("a",);
                    if (anchor && (anchor as HTMLAnchorElement).href) {
                      event.preventDefault();
                      openUrl((anchor as HTMLAnchorElement).href,);
                      return true;
                    }
                    return false;
                  },
                },
              },),
            ];
          },
        },).configure({ openOnClick: false, autolink: true, },),
        TaskList,
        CustomTaskItem.configure({ nested: true, },),
        Table.configure({ resizable: true, HTMLAttributes: { class: "tiptap-table", }, },),
        TableRow,
        TableHeader,
        TableCell,
        Highlight,
        HashtagExtension,
        WidgetExtension,
        CustomListKeymap,
        ClipboardTextSerializer,
        FileHandler.configure({
          allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp",],
          onDrop: (_editor: TiptapEditor, files: File[], pos: number,) => {
            (async () => {
              for (const file of files) {
                const relativePath = await saveImage(file,);
                const assetUrl = await resolveAssetUrl(relativePath,);
                _editor.chain().insertContentAt(pos, {
                  type: "image",
                  attrs: { src: assetUrl, alt: file.name, },
                },).focus().run();
              }
            })().catch(console.error,);
            return true;
          },
          onPaste: (_editor: TiptapEditor, files: File[],) => {
            (async () => {
              for (const file of files) {
                const relativePath = await saveImage(file,);
                const assetUrl = await resolveAssetUrl(relativePath,);
                _editor.chain().focus().insertContent({
                  type: "image",
                  attrs: { src: assetUrl, alt: file.name, },
                },).run();
              }
            })().catch(console.error,);
            return true;
          },
        },),
      ],
      content: md2json(note.content,),
      editable: true,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "max-w-none focus:outline-hidden px-6 text-gray-900 dark:text-gray-100",
        },
        handleKeyDown: (_view, event,) => {
          if (event.metaKey && event.key === "l") {
            event.preventDefault();
            editor?.chain().focus().toggleTaskList().run();
            return true;
          }
          if (event.key === "Backspace") {
            const { $from, empty, } = _view.state.selection;
            if (empty && $from.parentOffset === 0 && $from.parent.type.name === "heading") {
              const tr = _view.state.tr.setBlockType(
                $from.before(),
                $from.after(),
                _view.state.schema.nodes.paragraph,
              );
              _view.dispatch(tr,);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor, },) => {
        saveDebounced(json2md(editor.getJSON(),),);
      },
    },);

    useImperativeHandle(
      ref,
      () => {
        return {
          focus: () => {
            editor?.commands.focus();
          },
          editor: editor ?? null,
        };
      },
      [editor,],
    );

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const incoming = md2json(note.content,);
      if (!editor.isFocused) {
        editor.commands.setContent(incoming, { emitUpdate: false, },);
      }
    }, [note.content,],);

    return (
      <>
        {editor && <EditorBubbleMenu editor={editor} />}
        <EditorContent editor={editor} />
      </>
    );
  },
);

export default EditableNote;
