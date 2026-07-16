import { useState } from "react";
import { agenciesApi, membershipsApi } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { AGENCY_ROLES, agencyRoleLabel } from "@/lib/agencyRoles";
import { cn } from "@/lib/utils";
import type { AgencyRole, User } from "@/types";

/**
 * Gestiona a qué subcuentas (agencias) tiene acceso un usuario. Un usuario
 * puede tener acceso a varias. Sin ningún acceso = ve todas (acceso completo).
 */
export function UserAccessDialog({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Accesos a subcuentas</DialogTitle>
          <DialogDescription>
            {user
              ? `Elige a qué agencias tiene acceso ${user.email} y con qué rol.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {user && <AccessManager user={user} />}
      </DialogContent>
    </Dialog>
  );
}

function AccessManager({ user }: { user: User }) {
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([agenciesApi.list(), membershipsApi.list()]),
  );
  const runMutation = useMutationHandler();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const agencies = data?.[0] ?? [];
  const memberships = (data?.[1] ?? []).filter((m) => m.user_id === user.id);
  const byAgency = new Map(memberships.map((m) => [m.agency_id, m]));

  async function toggle(agencyId: string) {
    setBusy(agencyId);
    setFailure(null);
    const existing = byAgency.get(agencyId);
    const err = await runMutation(async () => {
      if (existing) {
        await membershipsApi.remove(existing.id);
      } else {
        await membershipsApi.create({
          agency_id: agencyId,
          user_id: user.id,
          role: "OPERATOR",
        });
      }
    });
    setBusy(null);
    if (err) setFailure(err);
    await reload();
  }

  async function changeRole(membershipId: string, role: AgencyRole) {
    setBusy(membershipId);
    setFailure(null);
    const err = await runMutation(() =>
      membershipsApi.updateRole(membershipId, role),
    );
    setBusy(null);
    if (err) setFailure(err);
    await reload();
  }

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {(error || failure) && (
        <Alert variant="destructive">
          <AlertDescription>{failure ?? error}</AlertDescription>
        </Alert>
      )}
      <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
        {agencies.map((agency) => {
          const membership = byAgency.get(agency.id);
          const active = Boolean(membership);
          return (
            <div
              key={agency.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`Acceso a ${agency.name}`}
                disabled={busy === agency.id}
                onClick={() => void toggle(agency.id)}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                  active ? "bg-primary" : "bg-input",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform",
                    active ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{agency.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {agency.location}
                </p>
              </div>
              {active && membership && (
                <Select
                  items={AGENCY_ROLES.map((role) => ({
                    value: role,
                    label: agencyRoleLabel(role),
                  }))}
                  value={membership.role}
                  onValueChange={(role) =>
                    void changeRole(membership.id, role as AgencyRole)
                  }
                >
                  <SelectTrigger size="sm" className="w-32">
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
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Sin accesos marcados, el usuario ve todas las agencias (acceso completo).
        Marca una o varias para limitar su alcance.
      </p>
    </div>
  );
}
