import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTOMATION_VARIABLES,
  splitVariables,
  type AutomationVariable,
} from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

type VariableTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Variables disponibles (integradas + personalizadas del flujo). */
  variables?: AutomationVariable[];
};

/** Estado del autocompletado disparado al escribir `{{`. */
type Suggest = { query: string; from: number; to: number } | null;

/**
 * Textarea con resaltado de variables {{...}}: un espejo detrás pinta los
 * tokens con el color de acento mientras el textarea real queda con texto
 * transparente encima (técnica de "highlighted textarea").
 *
 * Al escribir `{{` aparece un autocompletado con las variables disponibles;
 * también hay un botón "Insertar variable" que las inserta en el cursor.
 */
export function VariableTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  variables = AUTOMATION_VARIABLES,
}: VariableTextareaProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggest, setSuggest] = useState<Suggest>(null);
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Mantiene el espejo sincronizado con el scroll del textarea.
  useEffect(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) {
      return;
    }
    const sync = () => {
      backdrop.scrollTop = textarea.scrollTop;
    };
    textarea.addEventListener("scroll", sync);
    return () => textarea.removeEventListener("scroll", sync);
  }, []);

  // Detecta si el cursor está dentro de un `{{...` sin cerrar y calcula el
  // rango a reemplazar al elegir una variable.
  const refreshSuggest = useCallback((textarea: HTMLTextAreaElement) => {
    const caret = textarea.selectionStart;
    const before = textarea.value.slice(0, caret);
    const match = /\{\{\s*([\w.]*)$/.exec(before);
    if (!match) {
      setSuggest(null);
      return;
    }
    setSuggest({ query: match[1], from: match.index, to: caret });
    setActive(0);
  }, []);

  const matches = suggest
    ? variables.filter(
        (variable) =>
          variable.token.toLowerCase().includes(suggest.query.toLowerCase()) ||
          variable.label.toLowerCase().includes(suggest.query.toLowerCase()),
      )
    : [];
  const showList = Boolean(suggest) && matches.length > 0;

  function insertAtCaret(token: string) {
    const textarea = textareaRef.current;
    const caret = textarea?.selectionStart ?? value.length;
    const snippet = `{{${token}}}`;
    const next = `${value.slice(0, caret)}${snippet}${value.slice(caret)}`;
    onChange(next);
    setPickerOpen(false);
    // Recoloca el cursor tras la variable insertada.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = caret + snippet.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function acceptSuggestion(token: string) {
    if (!suggest) {
      return;
    }
    const snippet = `{{${token}}}`;
    const next = `${value.slice(0, suggest.from)}${snippet}${value.slice(
      suggest.to,
    )}`;
    onChange(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = suggest.from + snippet.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showList) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      acceptSuggestion(matches[active].token);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggest(null);
    }
  }

  const shared =
    "w-full rounded-lg border border-input px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words";

  return (
    <div className="relative">
      <div className="relative">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={cn(
            shared,
            "pointer-events-none absolute inset-0 overflow-hidden border-transparent text-transparent",
          )}
        >
          {splitVariables(value).map((segment, index) =>
            segment.variable ? (
              <span
                key={index}
                className="rounded bg-primary/15 font-medium text-primary"
              >
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
          {/* Salto final para que el espejo no recorte la última línea. */}
          {"\n"}
        </div>
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            refreshSuggest(event.target);
          }}
          onKeyDown={onKeyDown}
          onClick={(event) => refreshSuggest(event.currentTarget)}
          onBlur={() => {
            // Cierra tras el clic en una sugerencia (que dispara antes el blur).
            window.setTimeout(() => setSuggest(null), 120);
          }}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            shared,
            "relative resize-y bg-transparent text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        />

        {showList && (
          <ul
            className="absolute left-2 z-20 mt-1 max-h-52 w-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
            role="listbox"
          >
            {matches.map((variable, index) => (
              <li key={variable.token}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  // onMouseDown evita el blur del textarea antes del clic.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    acceptSuggestion(variable.token);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex w-full flex-col rounded-md px-2 py-1.5 text-left outline-none",
                    index === active ? "bg-muted" : "hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-medium">
                    {`{{${variable.token}}}`}
                    {variable.custom && (
                      <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">
                        personalizada
                      </span>
                    )}
                  </span>
                  {variable.description && (
                    <span className="text-xs text-muted-foreground">
                      {variable.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          className="text-xs font-medium text-primary hover:underline"
        >
          + Insertar variable
        </button>
        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden="true"
              onClick={() => setPickerOpen(false)}
            />
            <ul
              className="absolute left-0 z-20 mt-1 max-h-52 w-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
              role="listbox"
            >
              {variables.map((variable) => (
                <li key={variable.token}>
                  <button
                    type="button"
                    onClick={() => insertAtCaret(variable.token)}
                    className="flex w-full flex-col rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted"
                  >
                    <span className="text-sm font-medium">
                      {`{{${variable.token}}}`}
                      {variable.custom && (
                        <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">
                          personalizada
                        </span>
                      )}
                    </span>
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
  );
}
