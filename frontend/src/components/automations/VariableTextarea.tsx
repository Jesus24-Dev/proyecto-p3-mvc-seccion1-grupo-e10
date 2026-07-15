import { useEffect, useRef } from "react";
import { splitVariables } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

type VariableTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

/**
 * Textarea con resaltado de variables {{...}}: un espejo detrás pinta los
 * tokens con el color de acento mientras el textarea real queda con texto
 * transparente encima (técnica de "highlighted textarea").
 */
export function VariableTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
}: VariableTextareaProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const shared =
    "w-full rounded-lg border border-input px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words";

  return (
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          shared,
          "relative resize-y bg-transparent text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      />
    </div>
  );
}
