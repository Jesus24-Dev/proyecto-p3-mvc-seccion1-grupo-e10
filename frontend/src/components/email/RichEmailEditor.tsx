import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";
import {
  AUTOMATION_VARIABLES,
  type AutomationVariable,
} from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

type RichEmailEditorProps = {
  value: string;
  onChange: (html: string) => void;
  variables?: AutomationVariable[];
  placeholder?: string;
};

// Colores de texto disponibles en el contenido (contenido, no chrome de UI).
const TEXT_COLORS = [
  { label: "Tinta", value: "" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#059669" },
  { label: "Gris", value: "#6b7280" },
];

/** Envuelve texto plano heredado en HTML de párrafos para el editor. */
function toHtml(value: string): string {
  if (!value || value.includes("<")) {
    return value;
  }
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

export function RichEmailEditor({
  value,
  onChange,
  variables = AUTOMATION_VARIABLES,
  placeholder,
}: RichEmailEditorProps) {
  const [variableOpen, setVariableOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener" } },
      }),
      TextStyle,
      Color,
      Image.configure({ inline: false, HTMLAttributes: { class: "email-img" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: toHtml(value),
    editorProps: {
      attributes: {
        class: "ProseMirror min-h-48 px-3 py-2.5 outline-none",
        "aria-label": placeholder ?? "Cuerpo del correo",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sincroniza si el valor cambia por fuera (p. ej. generación con IA).
  useEffect(() => {
    if (!editor) {
      return;
    }
    const next = toHtml(value);
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // Solo reacciona a cambios externos del valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  function insertVariable(token: string) {
    editor!.chain().focus().insertContent(`{{${token}}}`).run();
    setVariableOpen(false);
  }

  return (
    <div className="rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton
          label="Negrita"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Título 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Título 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista con viñetas"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Cita"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Alinear a la izquierda"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Centrar"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Alinear a la derecha"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Insertar enlace"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("URL del enlace:");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
            } else {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Insertar imagen"
          onClick={() => {
            const url = window.prompt("URL de la imagen:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>

        {/* Color de texto */}
        <div className="relative">
          <ToolbarButton
            label="Color de texto"
            onClick={() => {
              setColorOpen((open) => !open);
              setVariableOpen(false);
            }}
          >
            <span
              className="size-4 rounded-full border"
              style={{ backgroundColor: editor.getAttributes("textStyle").color || "currentColor" }}
              aria-hidden="true"
            />
          </ToolbarButton>
          {colorOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColorOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 z-20 mt-1 flex gap-1 rounded-lg border bg-popover p-1.5 shadow-md">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.label}
                    type="button"
                    aria-label={color.label}
                    className="size-6 rounded-full border transition-transform hover:scale-110"
                    style={{ backgroundColor: color.value || "var(--foreground)" }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (color.value) {
                        editor.chain().focus().setColor(color.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                      setColorOpen(false);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Insertar variable */}
        <div className="relative ms-auto">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setVariableOpen((open) => !open);
              setColorOpen(false);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Braces className="size-3.5" aria-hidden="true" />
            Variable
          </button>
          {variableOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setVariableOpen(false)} aria-hidden="true" />
              <ul className="absolute right-0 z-20 mt-1 max-h-56 w-60 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                {variables.map((variable) => (
                  <li key={variable.token}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertVariable(variable.token)}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <span className="text-sm font-medium">{`{{${variable.token}}}`}</span>
                      {variable.description && (
                        <span className="text-xs text-muted-foreground">
                          {variable.description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "text-sm leading-relaxed",
          "[&_.ProseMirror]:min-h-48",
          "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
          "[&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-medium",
          "[&_p]:my-2",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_a]:font-medium [&_a]:text-primary [&_a]:underline",
          "[&_blockquote]:my-2 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
          "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md",
        )}
      />
    </div>
  );
}

export type { Editor };
