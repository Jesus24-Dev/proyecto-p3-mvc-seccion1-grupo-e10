import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookUser, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { contactsApi, usersApi } from "@/api";
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
import { ariaSort, SortButton, useSortable } from "@/hooks/useSortable";
import { formatDate, toDateInputValue } from "@/lib/format";
import type { UserInformation } from "@/types";

type FormState = {
  user_id: string;
  first_name: string;
  last_name: string;
  document_id: string;
  phone: string;
  address: string;
  birthday: string;
};

const emptyForm: FormState = {
  user_id: "",
  first_name: "",
  last_name: "",
  document_id: "",
  phone: "",
  address: "",
  birthday: "",
};

export function ContactsPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([contactsApi.list(), usersApi.list()]),
  );
  const [contacts, users] = data ?? [[], []];
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<UserInformation | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contactToDelete, setContactToDelete] =
    useState<UserInformation | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  /** Solo los usuarios que aún no tienen ficha de contacto (relación 1 a 1). */
  const usersWithoutContact = useMemo(() => {
    const withContact = new Set(contacts.map((contact) => contact.user_id));
    return users.filter((user) => !withContact.has(user.id));
  }, [contacts, users]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const owner = userById.get(contact.user_id);

      return (
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query) ||
        owner?.email.toLowerCase().includes(query)
      );
    });
  }, [contacts, search, userById]);

  const {
    sorted: sortedContacts,
    sortKey,
    direction,
    toggle,
  } = useSortable(filteredContacts, {
    name: (contact) => `${contact.first_name} ${contact.last_name}`,
    owner: (contact) => userById.get(contact.user_id)?.email ?? "",
    address: (contact) => contact.address,
    birthday: (contact) => Date.parse(contact.birthday) || 0,
  });

  function openCreate() {
    setEditingContact(null);
    setForm({ ...emptyForm, user_id: usersWithoutContact[0]?.id ?? "" });
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(contact: UserInformation) {
    setEditingContact(contact);
    setForm({
      user_id: contact.user_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      document_id: contact.document_id,
      phone: contact.phone,
      address: contact.address,
      birthday: toDateInputValue(contact.birthday),
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const failure = await runMutation(async () => {
      if (editingContact) {
        await contactsApi.update(editingContact.user_id, {
          first_name: form.first_name,
          last_name: form.last_name,
          document_id: form.document_id,
          phone: form.phone,
          address: form.address,
          birthday: form.birthday,
        });
      } else {
        await contactsApi.create(form);
      }
    });

    setIsSaving(false);

    if (failure) {
      setFormError(failure);
      return;
    }

    setIsFormOpen(false);
    setNotice({
      text: editingContact
        ? "Contacto actualizado correctamente."
        : "Contacto registrado correctamente.",
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!contactToDelete) {
      return;
    }

    const failure = await runMutation(() =>
      contactsApi.remove(contactToDelete.user_id),
    );
    setContactToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Contacto eliminado correctamente.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Ficha personal de cada usuario: nombre, dirección y fecha de nacimiento."
      >
        <Button onClick={openCreate} disabled={usersWithoutContact.length === 0}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Registrar contacto
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

      <div className="mb-4 relative max-w-xs">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, dirección o correo"
          aria-label="Buscar contactos"
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
          ) : filteredContacts.length === 0 ? (
            <EmptyState
              icon={BookUser}
              title={search ? "Sin resultados" : "Aún no hay contactos"}
              hint={
                search
                  ? "Ningún contacto coincide con la búsqueda."
                  : usersWithoutContact.length === 0
                    ? "Todos los usuarios ya tienen su ficha de contacto."
                    : "Registra la ficha personal de un usuario para completar su perfil."
              }
              action={
                search || usersWithoutContact.length === 0 ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Registrar contacto
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="pl-6"
                    aria-sort={ariaSort("name", sortKey, direction)}
                  >
                    <SortButton
                      label="Nombre"
                      columnKey="name"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("owner", sortKey, direction)}>
                    <SortButton
                      label="Usuario"
                      columnKey="owner"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell"
                    aria-sort={ariaSort("address", sortKey, direction)}
                  >
                    <SortButton
                      label="Dirección"
                      columnKey="address"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell"
                    aria-sort={ariaSort("birthday", sortKey, direction)}
                  >
                    <SortButton
                      label="Nacimiento"
                      columnKey="birthday"
                      sortKey={sortKey}
                      direction={direction}
                      onToggle={toggle}
                    />
                  </TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContacts.map((contact) => {
                  const owner = userById.get(contact.user_id);

                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="pl-6 font-medium">
                        <Link
                          to={`/admin/contacts/${contact.id}`}
                          className="rounded-sm underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {contact.first_name} {contact.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>{owner?.email ?? "—"}</TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                        {contact.address}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                        {formatDate(contact.birthday)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar contacto de ${contact.first_name} ${contact.last_name}`}
                            onClick={() => openEdit(contact)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar contacto de ${contact.first_name} ${contact.last_name}`}
                            onClick={() => setContactToDelete(contact)}
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
              {editingContact ? "Editar contacto" : "Registrar contacto"}
            </DialogTitle>
            <DialogDescription>
              Cada usuario tiene una única ficha con sus datos personales.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-user">Usuario</Label>
              {editingContact ? (
                <Input
                  id="contact-user"
                  value={userById.get(editingContact.user_id)?.email ?? ""}
                  disabled
                />
              ) : (
                <Select
                  items={usersWithoutContact.map((user) => ({
                    value: user.id,
                    label: user.email,
                  }))}
                  value={form.user_id}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      user_id: value as string,
                    }))
                  }
                >
                  <SelectTrigger id="contact-user" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {usersWithoutContact.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contact-first-name">Nombre</Label>
                <Input
                  id="contact-first-name"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      first_name: event.target.value,
                    }))
                  }
                  placeholder="María"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-last-name">Apellido</Label>
                <Input
                  id="contact-last-name"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      last_name: event.target.value,
                    }))
                  }
                  placeholder="Pérez"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contact-document">Cédula / RIF</Label>
                <Input
                  id="contact-document"
                  value={form.document_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      document_id: event.target.value,
                    }))
                  }
                  placeholder="V-12345678 / J-12345678-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-phone">Teléfono</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+58 412 555 1234"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-address">Dirección</Label>
              <Input
                id="contact-address"
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Av. Bolívar, Caracas"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-birthday">Fecha de nacimiento</Label>
              <Input
                id="contact-birthday"
                type="date"
                value={form.birthday}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birthday: event.target.value,
                  }))
                }
                required
              />
            </div>
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
                  : editingContact
                    ? "Guardar cambios"
                    : "Registrar contacto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(contactToDelete)}
        onOpenChange={(open) => !open && setContactToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la ficha de {contactToDelete?.first_name}{" "}
              {contactToDelete?.last_name}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar contacto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
