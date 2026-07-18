import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BookUser,
  ListFilter,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { contactsApi, smartListsApi, tagsApi, usersApi } from "@/api";
import { toast } from "sonner";
import type { SmartList, SmartListCondition, UserInformation } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { nodeChipClass } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";

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

// Campos y operadores del constructor de listas inteligentes.
const SMART_FIELDS = [
  { value: "email", label: "Correo" },
  { value: "phone", label: "Teléfono" },
  { value: "document", label: "Cédula / RIF" },
  { value: "address", label: "Dirección" },
  { value: "tag", label: "Etiqueta" },
] as const;

const SET_OPS = [
  { value: "set", label: "está definido" },
  { value: "not_set", label: "no está definido" },
] as const;

const TAG_OPS = [
  { value: "has", label: "tiene" },
  { value: "not_has", label: "no tiene" },
] as const;

// ¿Un contacto cumple TODAS las condiciones de una lista? (AND)
function contactMatches(
  conditions: SmartListCondition[],
  ownerEmail: string,
  contact: UserInformation,
  tags: string[],
): boolean {
  const has = (value: string | undefined | null) =>
    Boolean(value && String(value).trim());
  return conditions.every((c) => {
    switch (c.field) {
      case "email":
        return c.op === "not_set" ? !has(ownerEmail) : has(ownerEmail);
      case "phone":
        return c.op === "not_set" ? !has(contact.phone) : has(contact.phone);
      case "document":
        return c.op === "not_set"
          ? !has(contact.document_id)
          : has(contact.document_id);
      case "address":
        return c.op === "not_set" ? !has(contact.address) : has(contact.address);
      case "tag": {
        const hasTag = tags.includes(c.value ?? "");
        return c.op === "not_has" ? !hasTag : hasTag;
      }
      default:
        return true;
    }
  });
}

export function ContactsPage() {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([
      contactsApi.list(),
      usersApi.list(),
      tagsApi.list(),
      smartListsApi.list(),
    ]),
  );
  const contacts = data?.[0] ?? [];
  const users = data?.[1] ?? [];
  const tagCatalog = data?.[2] ?? [];
  const smartLists = data?.[3] ?? [];
  const runMutation = useMutationHandler();

  // Filtro rápido por etiqueta ("all" = todas) y color por etiqueta.
  const [tagFilter, setTagFilter] = useState("all");
  const tagColorByName = useMemo(
    () => new Map(tagCatalog.map((tag) => [tag.name, tag.color])),
    [tagCatalog],
  );

  // Lista inteligente activa + constructor de nuevas listas.
  const [activeListId, setActiveListId] = useState("all");
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listConditions, setListConditions] = useState<SmartListCondition[]>([
    { field: "tag", op: "has", value: "" },
  ]);
  const activeList = smartLists.find((list) => list.id === activeListId) ?? null;

  // Etiquetas por contacto en estado local, para agregar/quitar sin recargar.
  const [tagsByContact, setTagsByContact] = useState<Record<string, string[]>>(
    {},
  );
  useEffect(() => {
    setTagsByContact(
      Object.fromEntries(contacts.map((contact) => [contact.id, contact.tags])),
    );
    // Se resincroniza cuando cambia el conjunto de contactos cargados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length]);

  const tagNames = useMemo(
    () => [...new Set(tagCatalog.map((tag) => tag.name))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    [tagCatalog],
  );

  async function addContactTag(contactId: string, tag: string) {
    if ((tagsByContact[contactId] ?? []).includes(tag)) {
      return;
    }
    const failure = await runMutation(async () => {
      const res = await contactsApi.addTag(contactId, tag);
      setTagsByContact((current) => ({ ...current, [contactId]: res.tags }));
    });
    if (failure) {
      toast.error("No se pudo agregar la etiqueta", { description: failure });
    } else {
      toast.success(`Etiqueta #${tag} agregada`);
    }
  }

  async function removeContactTag(contactId: string, tag: string) {
    const failure = await runMutation(async () => {
      const res = await contactsApi.removeTag(contactId, tag);
      setTagsByContact((current) => ({ ...current, [contactId]: res.tags }));
    });
    if (failure) {
      toast.error("No se pudo quitar la etiqueta", { description: failure });
    } else {
      toast.success(`Etiqueta #${tag} quitada`);
    }
  }

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
    // 1) Filtra por lista inteligente y por etiqueta rápida.
    const base = contacts.filter((contact) => {
      const contactTags = tagsByContact[contact.id] ?? contact.tags;
      if (
        activeList &&
        !contactMatches(
          activeList.conditions,
          userById.get(contact.user_id)?.email ?? "",
          contact,
          contactTags,
        )
      ) {
        return false;
      }
      if (tagFilter !== "all" && !contactTags.includes(tagFilter)) {
        return false;
      }
      return true;
    });

    // 2) Filtra por la búsqueda de texto.
    const query = search.trim().toLowerCase();
    if (!query) {
      return base;
    }
    return base.filter((contact) => {
      const owner = userById.get(contact.user_id);
      return (
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query) ||
        owner?.email.toLowerCase().includes(query)
      );
    });
  }, [contacts, search, userById, activeList, tagsByContact]);

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

  function addCondition() {
    setListConditions((current) => [
      ...current,
      { field: "email", op: "set" },
    ]);
  }

  function updateCondition(index: number, patch: Partial<SmartListCondition>) {
    setListConditions((current) =>
      current.map((cond, i) => {
        if (i !== index) {
          return cond;
        }
        const next = { ...cond, ...patch };
        // Al cambiar de campo, ajusta el operador por defecto.
        if (patch.field !== undefined) {
          if (patch.field === "tag") {
            next.op = "has";
          } else {
            next.op = "set";
            next.value = undefined;
          }
        }
        return next;
      }),
    );
  }

  function removeCondition(index: number) {
    setListConditions((current) => current.filter((_, i) => i !== index));
  }

  async function saveSmartList() {
    const conditions = listConditions.filter(
      (c) => c.field && c.op && (c.field !== "tag" || (c.value ?? "").trim()),
    );
    if (!listName.trim() || conditions.length === 0) {
      toast.error("Dale un nombre y al menos una condición válida.");
      return;
    }
    const failure = await runMutation(async () => {
      const created = await smartListsApi.create({
        name: listName.trim(),
        conditions,
      });
      setActiveListId(created.id);
    });
    if (failure) {
      toast.error("No se pudo crear la lista", { description: failure });
      return;
    }
    setListDialogOpen(false);
    setListName("");
    setListConditions([{ field: "tag", op: "has", value: "" }]);
    toast.success("Lista inteligente creada");
    void reload();
  }

  async function deleteSmartList(id: string) {
    const failure = await runMutation(() => smartListsApi.remove(id));
    if (failure) {
      toast.error("No se pudo eliminar la lista", { description: failure });
      return;
    }
    if (activeListId === id) {
      setActiveListId("all");
    }
    toast.success("Lista eliminada");
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

      {/* Listas inteligentes: segmentos guardados por condiciones. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ListFilter className="size-4 text-muted-foreground" aria-hidden="true" />
        <Select
          items={[
            { value: "all", label: "Todos los contactos" },
            ...smartLists.map((list) => ({ value: list.id, label: list.name })),
          ]}
          value={activeListId}
          onValueChange={(value) => setActiveListId(value as string)}
        >
          <SelectTrigger className="h-9 w-60" aria-label="Lista inteligente">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los contactos</SelectItem>
            {smartLists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                {list.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: "Todas las etiquetas" },
            ...tagNames.map((name) => ({ value: name, label: `#${name}` })),
          ]}
          value={tagFilter}
          onValueChange={(value) => setTagFilter(value as string)}
        >
          <SelectTrigger className="h-9 w-48" aria-label="Filtrar por etiqueta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las etiquetas</SelectItem>
            {tagNames.map((name) => (
              <SelectItem key={name} value={name}>
                #{name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeList && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredContacts.length} coincidencia
              {filteredContacts.length === 1 ? "" : "s"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Eliminar lista ${activeList.name}`}
              onClick={() => void deleteSmartList(activeList.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setListDialogOpen(true)}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Nueva lista inteligente
        </Button>
      </div>

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
                  <TableHead>Etiquetas</TableHead>
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
                      <TableCell>
                        {(() => {
                          const rowTags = tagsByContact[contact.id] ?? [];
                          const shown = rowTags.slice(0, 2);
                          const hidden = rowTags.slice(2);
                          const available = tagNames.filter(
                            (name) => !rowTags.includes(name),
                          );
                          return (
                            <div className="flex min-w-40 flex-nowrap items-center gap-1">
                              {shown.map((tag) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "inline-flex max-w-28 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                    nodeChipClass(tagColorByName.get(tag)),
                                  )}
                                >
                                  <span className="truncate">#{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void removeContactTag(contact.id, tag)
                                    }
                                    aria-label={`Quitar etiqueta ${tag}`}
                                    className="-mr-0.5 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-destructive"
                                  >
                                    <X className="size-3" aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                              {hidden.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <button
                                        type="button"
                                        className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                                        aria-label={`Ver ${hidden.length} etiquetas más`}
                                      >
                                        +{hidden.length}
                                      </button>
                                    }
                                  />
                                  <DropdownMenuContent align="start">
                                    {hidden.map((tag) => (
                                      <DropdownMenuItem
                                        key={tag}
                                        onClick={() =>
                                          void removeContactTag(contact.id, tag)
                                        }
                                      >
                                        <X
                                          className="mr-2 size-3.5 text-muted-foreground"
                                          aria-hidden="true"
                                        />
                                        #{tag}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                                      aria-label={`Agregar etiqueta a ${contact.first_name}`}
                                    >
                                      <Tag className="size-3" aria-hidden="true" />
                                      <Plus className="size-3" aria-hidden="true" />
                                    </button>
                                  }
                                />
                                <DropdownMenuContent align="start">
                                  {available.length === 0 ? (
                                    <DropdownMenuItem disabled>
                                      Sin etiquetas disponibles
                                    </DropdownMenuItem>
                                  ) : (
                                    available.map((name) => (
                                      <DropdownMenuItem
                                        key={name}
                                        onClick={() =>
                                          void addContactTag(contact.id, name)
                                        }
                                      >
                                        #{name}
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        })()}
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

      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva lista inteligente</DialogTitle>
            <DialogDescription>
              Un segmento de contactos que cumplen TODAS las condiciones. Se
              guarda y comparte con el equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="list-name">Nombre</Label>
              <Input
                id="list-name"
                value={listName}
                onChange={(event) => setListName(event.target.value)}
                placeholder="p. ej. Clientes VIP sin teléfono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Condiciones</Label>
              {listConditions.map((cond, index) => {
                const ops = cond.field === "tag" ? TAG_OPS : SET_OPS;
                return (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Select
                      items={SMART_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
                      value={cond.field}
                      onValueChange={(value) =>
                        updateCondition(index, { field: value as string })
                      }
                    >
                      <SelectTrigger className="h-9 w-36" aria-label="Campo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SMART_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      items={ops.map((o) => ({ value: o.value, label: o.label }))}
                      value={cond.op}
                      onValueChange={(value) =>
                        updateCondition(index, { op: value as string })
                      }
                    >
                      <SelectTrigger className="h-9 w-40" aria-label="Operador">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ops.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cond.field === "tag" &&
                      (tagNames.length > 0 ? (
                        <Select
                          items={tagNames.map((n) => ({ value: n, label: `#${n}` }))}
                          value={cond.value ?? ""}
                          onValueChange={(value) =>
                            updateCondition(index, { value: value as string })
                          }
                        >
                          <SelectTrigger className="h-9 w-36" aria-label="Etiqueta">
                            <SelectValue placeholder="Etiqueta" />
                          </SelectTrigger>
                          <SelectContent>
                            {tagNames.map((n) => (
                              <SelectItem key={n} value={n}>
                                #{n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-9 w-36"
                          value={cond.value ?? ""}
                          onChange={(event) =>
                            updateCondition(index, { value: event.target.value })
                          }
                          placeholder="etiqueta"
                        />
                      ))}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeCondition(index)}
                      aria-label="Quitar condición"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={addCondition}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Agregar condición
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setListDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => void saveSmartList()}>
              <Save data-icon="inline-start" aria-hidden="true" />
              Guardar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
