import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { tagsApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { NODE_COLORS, nodeChipClass } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

export function TagsPage() {
  const { activeAgencyId } = useActiveAgency();
  const { data: allTags, isLoading, error, reload } = usePageData(tagsApi.list);
  const runMutation = useMutationHandler();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<{ name: string; color: string }>({
    name: "",
    color: NODE_COLORS[0].id,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  // Etiquetas de la subcuenta activa (las etiquetas son por agencia).
  const tags = useMemo(
    () =>
      (allTags ?? []).filter((tag) =>
        activeAgencyId ? tag.agency_id === activeAgencyId : true,
      ),
    [allTags, activeAgencyId],
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", color: NODE_COLORS[0].id });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(tag: Tag) {
    setEditing(tag);
    setForm({ name: tag.name, color: tag.color || NODE_COLORS[0].id });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editing && !activeAgencyId) {
      setFormError("Elige una subcuenta activa para crear etiquetas.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Dale un nombre a la etiqueta.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const failure = await runMutation(async () => {
      if (editing) {
        await tagsApi.update(editing.id, {
          name: form.name.trim(),
          color: form.color,
        });
      } else {
        await tagsApi.create({
          name: form.name.trim(),
          color: form.color,
          agency_id: activeAgencyId!,
        });
      }
    });
    setIsSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setIsFormOpen(false);
    setNotice({
      text: editing ? "Etiqueta actualizada." : "Etiqueta creada.",
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!tagToDelete) {
      return;
    }
    const failure = await runMutation(() => tagsApi.remove(tagToDelete.id));
    setTagToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Etiqueta eliminada.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Etiquetas"
        description="Catálogo de etiquetas de la subcuenta. Se aplican a los contactos y las usan las automatizaciones."
      >
        <Button onClick={openCreate} disabled={!activeAgencyId}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nueva etiqueta
        </Button>
      </PageHeader>

      {notice && (
        <Alert
          variant={notice.tone === "danger" ? "destructive" : "default"}
          className="mb-4"
        >
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!activeAgencyId && (
        <Alert className="mb-4">
          <AlertDescription>
            Las etiquetas son por subcuenta. Elige una agencia en el selector
            superior para crear o gestionar sus etiquetas.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={TagIcon}
              title="Aún no hay etiquetas"
              hint="Crea etiquetas para segmentar contactos y disparar automatizaciones."
              action={
                <Button
                  variant="outline"
                  onClick={openCreate}
                  disabled={!activeAgencyId}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Nueva etiqueta
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id} className="py-4">
              <CardContent className="flex items-center gap-3 px-4">
                <Badge className={cn("shrink-0", nodeChipClass(tag.color))}>
                  #{tag.name}
                </Badge>
                <div className="ms-auto flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${tag.name}`}
                    onClick={() => openEdit(tag)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Eliminar ${tag.name}`}
                    onClick={() => setTagToDelete(tag)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        ¿Buscas dónde se aplican? Revisa los{" "}
        <Link to="/admin/contacts" className="underline underline-offset-2">
          contactos
        </Link>{" "}
        y las{" "}
        <Link
          to="/admin/automations"
          className="underline underline-offset-2"
        >
          automatizaciones
        </Link>
        .
      </p>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar etiqueta" : "Nueva etiqueta"}
              </DialogTitle>
              <DialogDescription>
                Se guardará en la subcuenta activa.
              </DialogDescription>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="tag-name">Nombre</Label>
              <Input
                id="tag-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="p. ej. vip"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {NODE_COLORS.map((option) => {
                  const isActive = form.color === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, color: option.id }))
                      }
                      aria-label={`Color ${option.label}`}
                      aria-pressed={isActive}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform hover:scale-110",
                        isActive
                          ? "border-ring ring-2 ring-ring/30"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: option.dot }}
                    />
                  );
                })}
              </div>
              <Badge className={cn("w-fit", nodeChipClass(form.color))}>
                #{form.name.trim() || "etiqueta"}
              </Badge>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(tagToDelete)}
        onOpenChange={(open) => !open && setTagToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{tagToDelete?.name}" del catálogo. Los contactos que
              ya la tengan aplicada no se modifican.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar etiqueta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
