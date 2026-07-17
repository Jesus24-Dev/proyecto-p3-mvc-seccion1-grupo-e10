import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { rolesApi } from "@/api";
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
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { PERMISSION_CATALOG, permissionLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";

export function RolesPage() {
  const { data: roles, isLoading, error, reload } = usePageData(rolesApi.list);
  const runMutation = useMutationHandler();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppRole | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({ name: "", description: "", permissions: [] });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AppRole | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", permissions: [] });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(role: AppRole) {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  function togglePermission(key: string) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((p) => p !== key)
        : [...current.permissions, key],
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Dale un nombre al rol.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const failure = await runMutation(async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      };
      if (editing) {
        await rolesApi.update(editing.id, payload);
      } else {
        await rolesApi.create(payload);
      }
    });
    setIsSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setIsFormOpen(false);
    setNotice({
      text: editing ? "Rol actualizado." : "Rol creado.",
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const failure = await runMutation(() => rolesApi.remove(toDelete.id));
    setToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Rol eliminado.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Define los roles del personal y qué puede hacer cada uno por módulo."
      >
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nuevo rol
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (roles ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ShieldCheck}
              title="Aún no hay roles"
              hint="Crea roles para segmentar lo que puede hacer cada miembro del equipo."
              action={
                <Button variant="outline" onClick={openCreate}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Nuevo rol
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(roles ?? []).map((role) => (
            <Card key={role.id} className="py-5">
              <CardContent className="grid gap-3 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <ShieldCheck
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {role.name}
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {role.description || "Sin descripción"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${role.name}`}
                      onClick={() => openEdit(role)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    {!role.is_system && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Eliminar ${role.name}`}
                        onClick={() => setToDelete(role)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Sin permisos
                    </span>
                  ) : (
                    role.permissions.map((key) => (
                      <Badge key={key} variant="outline">
                        {permissionLabel(key)}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit} className="grid max-h-[85vh] gap-4 overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar rol" : "Nuevo rol"}</DialogTitle>
              <DialogDescription>
                Marca los permisos que tendrá el rol en cada módulo.
              </DialogDescription>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="role-name">Nombre</Label>
              <Input
                id="role-name"
                value={form.name}
                onChange={(event) =>
                  setForm((c) => ({ ...c, name: event.target.value }))
                }
                placeholder="p. ej. Operador logístico"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-desc">Descripción</Label>
              <Input
                id="role-desc"
                value={form.description}
                onChange={(event) =>
                  setForm((c) => ({ ...c, description: event.target.value }))
                }
                placeholder="Qué hace este rol"
              />
            </div>
            <div className="grid gap-3">
              <Label>Permisos</Label>
              {PERMISSION_CATALOG.map((group) => (
                <div key={group.module} className="grid gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {group.module}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {group.permissions.map((perm) => {
                      const active = form.permissions.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => togglePermission(perm.key)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                            active
                              ? "border-primary/40 bg-primary/5 text-foreground"
                              : "text-muted-foreground hover:bg-muted/60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input",
                            )}
                          >
                            {active && <Check className="size-3" aria-hidden="true" />}
                          </span>
                          {perm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el rol "{toDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar rol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
