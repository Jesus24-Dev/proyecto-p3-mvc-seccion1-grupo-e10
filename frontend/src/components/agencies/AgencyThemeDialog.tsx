import { useState } from "react";
import { Check } from "lucide-react";
import { agenciesApi } from "@/api";
import { useMutationHandler } from "@/hooks/usePageData";
import { useTheme } from "@/context/ThemeContext";
import { useActiveAgency } from "@/context/AgencyContext";
import { ACCENT_PRESETS, DEFAULT_THEME } from "@/lib/themes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Agency, AgencyTheme } from "@/types";

type AgencyThemeDialogProps = {
  agency: Agency | null;
  onClose: () => void;
  onSaved: (agency: Agency) => void;
};

const RADIUS_OPTIONS = [
  { value: 0, label: "Recto" },
  { value: 0.375, label: "Suave" },
  { value: 0.625, label: "Redondeado" },
  { value: 1, label: "Muy redondeado" },
];

export function AgencyThemeDialog({
  agency,
  onClose,
  onSaved,
}: AgencyThemeDialogProps) {
  const runMutation = useMutationHandler();
  const { setAgencyTheme } = useTheme();
  const { activeAgencyId } = useActiveAgency();

  const [draft, setDraft] = useState<AgencyTheme>(
    agency?.theme ?? DEFAULT_THEME,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sincroniza el borrador cuando cambia la agencia objetivo.
  if (agency && draft !== agency.theme && !isSaving) {
    // noop: draft se inicializa por agencia vía key en el padre
  }

  async function handleSave() {
    if (!agency) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const failure = await runMutation(async () => {
      const updated = await agenciesApi.updateTheme(agency.id, draft);
      onSaved(updated);
      // Si la agencia editada es la activa, aplica el tema al instante.
      if (activeAgencyId === agency.id) {
        setAgencyTheme(draft);
      }
    });

    setIsSaving(false);

    if (failure) {
      setError(failure);
      return;
    }

    onClose();
  }

  return (
    <Dialog open={Boolean(agency)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apariencia de {agency?.name}</DialogTitle>
          <DialogDescription>
            Personaliza el color y la forma de esta subcuenta. Se aplica cuando
            la agencia está activa.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Label>Color de acento</Label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                aria-pressed={draft.accent === preset.id}
                onClick={() =>
                  setDraft((current) => ({ ...current, accent: preset.id }))
                }
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  draft.accent === preset.id
                    ? "border-foreground"
                    : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: preset.swatch }}
              >
                {draft.accent === preset.id && (
                  <Check className="size-4 text-white" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Forma</Label>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={draft.radius === option.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    radius: option.value,
                  }))
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft(agency?.theme ?? DEFAULT_THEME)
            }
          >
            Restablecer
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Guardando…" : "Guardar apariencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
