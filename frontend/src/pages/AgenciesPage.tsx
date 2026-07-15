import { useMemo, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { agenciesApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivePill } from "@/components/shared/pills";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { roleLabel } from "@/lib/roles";
import type { Agency } from "@/types";

type FormState = {
  name: string;
  location: string;
  user_id: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  location: "",
  user_id: "",
  is_active: true,
};

export function AgenciesPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([agenciesApi.list(), usersApi.list()]),
  );
  const [agencies, users] = data ?? [[], []];
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const filteredAgencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return agencies;
    }

    return agencies.filter((agency) => {
      const owner = userById.get(agency.user_id);

      return (
        agency.name.toLowerCase().includes(query) ||
        agency.location.toLowerCase().includes(query) ||
        owner?.email.toLowerCase().includes(query)
      );
    });
  }, [agencies, search, userById]);

  function openCreate() {
    setEditingAgency(null);
    setForm({ ...emptyForm, user_id: users[0]?.id ?? "" });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(agency: Agency) {
    setEditingAgency(agency);
    setForm({
      name: agency.name,
      location: agency.location,
      user_id: agency.user_id,
      is_active: agency.is_active,
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const failure = await runMutation(async () => {
      if (editingAgency) {
        await agenciesApi.update(editingAgency.id, form);
      } else {
        await agenciesApi.create({
          name: form.name,
          location: form.location,
          user_id: form.user_id,
        });
      }
    });

    setIsSaving(false);

    if (failure) {
      setFormError(failure);
      return;
    }

    setIsFormOpen(false);
    setNotice(
      editingAgency
        ? "Agencia actualizada correctamente."
        : "Agencia creada correctamente.",
    );
    void reload();
  }

  async function handleDelete() {
    if (!agencyToDelete) {
      return;
    }

    const failure = await runMutation(() =>
      agenciesApi.remove(agencyToDelete.id),
    );
    setAgencyToDelete(null);
    setNotice(failure ?? "Agencia eliminada correctamente.");
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Agencias"
        description="Sucursales y puntos operativos de la red, con su ubicación y usuario responsable."
      >
        <Button onClick={openCreate} disabled={users.length === 0}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Crear agencia
        </Button>
      </PageHeader>

      {notice && (
        <Alert className="mb-4">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 relative max-w-xs">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar agencia o responsable"
          aria-label="Buscar agencias"
          className="pl-9"
        />
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {isLoading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : filteredAgencies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={search ? "Sin resultados" : "Aún no hay agencias"}
              hint={
                search
                  ? "Ninguna agencia coincide con la búsqueda."
                  : "Registra la primera sucursal para empezar a organizar la red."
              }
              action={
                search || users.length === 0 ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Crear agencia
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Agencia</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Responsable
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.map((agency) => {
                  const owner = userById.get(agency.user_id);

                  return (
                    <TableRow key={agency.id}>
                      <TableCell className="pl-6 font-medium">
                        {agency.name}
                      </TableCell>
                      <TableCell>{agency.location}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {owner ? (
                          <div className="grid gap-0.5">
                            <span>{owner.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {roleLabel(owner.role)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Sin responsable
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActivePill isActive={agency.is_active} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${agency.name}`}
                            onClick={() => openEdit(agency)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar ${agency.name}`}
                            onClick={() => setAgencyToDelete(agency)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Editar agencia" : "Crear agencia"}
            </DialogTitle>
            <DialogDescription>
              Toda agencia necesita un nombre, una ubicación y un usuario
              responsable.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="agency-name">Nombre</Label>
              <Input
                id="agency-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Agencia Valencia Centro"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agency-location">Ubicación</Label>
              <Input
                id="agency-location"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Valencia, Carabobo"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agency-owner">Usuario responsable</Label>
              <Select
                value={form.user_id}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    user_id: value as string,
                  }))
                }
              >
                <SelectTrigger id="agency-owner" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} · {roleLabel(user.role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingAgency && (
              <div className="grid gap-2">
                <Label htmlFor="agency-active">Estado</Label>
                <Select
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_active: value === "active",
                    }))
                  }
                >
                  <SelectTrigger id="agency-active" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {formError && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line">
                  {formError}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Guardando…"
                  : editingAgency
                    ? "Guardar cambios"
                    : "Crear agencia"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(agencyToDelete)}
        onOpenChange={(open) => !open && setAgencyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta agencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la agencia {agencyToDelete?.name}. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar agencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
