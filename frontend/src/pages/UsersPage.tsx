import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RolePill } from "@/components/shared/pills";
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
import { roleLabel, roles } from "@/lib/roles";
import type { User, UserRole } from "@/types";

type FormState = {
  email: string;
  password: string;
  role: UserRole;
};

const emptyForm: FormState = { email: "", password: "", role: "USER" };

export function UsersPage() {
  const { data: users, isLoading, error, reload } = usePageData(usersApi.list);
  const runMutation = useMutationHandler();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    const query = search.trim().toLowerCase();

    if (!query) {
      return list;
    }

    return list.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        roleLabel(user.role).toLowerCase().includes(query),
    );
  }, [users, search]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({ email: user.email, password: "", role: user.role });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const failure = await runMutation(async () => {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await usersApi.create(form);
      }
    });

    setIsSaving(false);

    if (failure) {
      setFormError(failure);
      return;
    }

    setIsFormOpen(false);
    setNotice({
      text: editingUser
        ? "Usuario actualizado correctamente."
        : "Usuario creado correctamente.",
      tone: "success",
    });
    void reload();
  }

  async function handleDelete() {
    if (!userToDelete) {
      return;
    }

    const failure = await runMutation(() => usersApi.remove(userToDelete.id));
    setUserToDelete(null);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Usuario eliminado correctamente.", tone: "success" },
    );
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cuentas con acceso al sistema: administradores del panel, distribuidores y clientes."
      >
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Crear usuario
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
          placeholder="Buscar por correo o rol"
          aria-label="Buscar usuarios"
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
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "Sin resultados" : "Aún no hay usuarios"}
              hint={
                search
                  ? "Ningún usuario coincide con la búsqueda. Prueba con otro correo o rol."
                  : "Crea la primera cuenta para dar acceso al panel o asignar responsables."
              }
              action={
                search ? undefined : (
                  <Button variant="outline" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Crear usuario
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">ID</TableHead>
                  <TableHead className="w-24 pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="pl-6 font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <RolePill role={user.role} />
                    </TableCell>
                    <TableCell className="hidden max-w-48 truncate font-mono text-xs text-muted-foreground md:table-cell">
                      {user.id}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${user.email}`}
                          onClick={() => openEdit(user)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar ${user.email}`}
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar usuario" : "Crear usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza el correo y define una nueva contraseña para la cuenta."
                : "La cuenta queda disponible de inmediato para iniciar sesión."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="user-email">Correo electrónico</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="operador@drlogistics.local"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-password">
                {editingUser ? "Nueva contraseña" : "Contraseña"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                required={!editingUser}
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  Déjala en blanco para mantener la contraseña actual.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-role">Rol</Label>
              <Select
                items={roles.map((role) => ({
                  value: role,
                  label: roleLabel(role),
                }))}
                value={form.role}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    role: value as UserRole,
                  }))
                }
                disabled={Boolean(editingUser)}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  El rol no puede cambiarse después de crear la cuenta.
                </p>
              )}
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
                  : editingUser
                    ? "Guardar cambios"
                    : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta {userToDelete?.email}. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
