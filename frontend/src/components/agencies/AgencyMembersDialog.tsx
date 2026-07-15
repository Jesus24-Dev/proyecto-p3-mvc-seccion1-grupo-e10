import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { ApiRequestError, membershipsApi } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useMutationHandler } from "@/hooks/usePageData";
import { AGENCY_ROLES, agencyRoleLabel, agencyRolePermissions } from "@/lib/agencyRoles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Agency, AgencyRole, Membership, User } from "@/types";

type AgencyMembersDialogProps = {
  agency: Agency | null;
  users: User[];
  onClose: () => void;
};

export function AgencyMembersDialog({
  agency,
  users,
  onClose,
}: AgencyMembersDialogProps) {
  const { expireSession } = useAuth();
  const runMutation = useMutationHandler();

  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<AgencyRole>("OPERATOR");
  const [isAdding, setIsAdding] = useState(false);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.user_id));
    return users.filter((user) => !memberIds.has(user.id));
  }, [members, users]);

  useEffect(() => {
    if (!agency) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    membershipsApi
      .list(agency.id)
      .then((nextMembers) => {
        if (!isCancelled) {
          setMembers(nextMembers);
        }
      })
      .catch((caughtError: unknown) => {
        if (isCancelled) {
          return;
        }
        if (
          caughtError instanceof ApiRequestError &&
          (caughtError.statusCode === 401 || caughtError.statusCode === 403)
        ) {
          expireSession(caughtError.message);
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudieron cargar los miembros.",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [agency, expireSession]);

  useEffect(() => {
    setNewMemberUserId(availableUsers[0]?.id ?? "");
  }, [availableUsers]);

  async function handleAddMember() {
    if (!agency || !newMemberUserId) {
      return;
    }

    setIsAdding(true);
    setError(null);

    const failure = await runMutation(async () => {
      const created = await membershipsApi.create({
        agency_id: agency.id,
        user_id: newMemberUserId,
        role: newMemberRole,
      });
      setMembers((current) => [...current, created]);
    });

    setIsAdding(false);

    if (failure) {
      setError(failure);
    }
  }

  async function handleRoleChange(membership: Membership, role: AgencyRole) {
    setError(null);

    const failure = await runMutation(async () => {
      const updated = await membershipsApi.updateRole(membership.id, role);
      setMembers((current) =>
        current.map((member) =>
          member.id === membership.id ? updated : member,
        ),
      );
    });

    if (failure) {
      setError(failure);
    }
  }

  async function handleRemove(membership: Membership) {
    setError(null);

    const failure = await runMutation(async () => {
      await membershipsApi.remove(membership.id);
      setMembers((current) =>
        current.filter((member) => member.id !== membership.id),
      );
    });

    if (failure) {
      setError(failure);
    }
  }

  return (
    <Dialog open={Boolean(agency)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Miembros de {agency?.name}</DialogTitle>
          <DialogDescription>
            Quién puede trabajar en esta subcuenta y con qué permisos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-11/12" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Esta agencia aún no tiene miembros asignados.
          </p>
        ) : (
          <ul className="grid gap-2">
            {members.map((member) => {
              const user = userById.get(member.user_id);

              return (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRound className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {user?.email ?? "Usuario eliminado"}
                  </span>
                  <Select
                    items={AGENCY_ROLES.map((role) => ({
                      value: role,
                      label: agencyRoleLabel(role),
                    }))}
                    value={member.role}
                    onValueChange={(value) =>
                      void handleRoleChange(member, value as AgencyRole)
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Rol de ${user?.email ?? "miembro"}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENCY_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {agencyRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Quitar a ${user?.email ?? "miembro"} de la agencia`}
                    onClick={() => void handleRemove(member)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <Separator />

        {availableUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los usuarios ya son miembros de esta agencia.
          </p>
        ) : (
          <div className="grid gap-3">
            <Label>Agregar miembro</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Select
                items={availableUsers.map((user) => ({
                  value: user.id,
                  label: user.email,
                }))}
                value={newMemberUserId}
                onValueChange={(value) => setNewMemberUserId(value as string)}
              >
                <SelectTrigger aria-label="Usuario a agregar" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                items={AGENCY_ROLES.map((role) => ({
                  value: role,
                  label: agencyRoleLabel(role),
                }))}
                value={newMemberRole}
                onValueChange={(value) => setNewMemberRole(value as AgencyRole)}
              >
                <SelectTrigger aria-label="Rol del nuevo miembro">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENCY_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {agencyRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => void handleAddMember()}
                disabled={isAdding || !newMemberUserId}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                {isAdding ? "Agregando…" : "Agregar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {agencyRolePermissions(newMemberRole)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
