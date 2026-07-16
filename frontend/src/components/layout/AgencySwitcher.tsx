import { useEffect, useMemo } from "react";
import { Building2, Check, ChevronsUpDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agenciesApi, membershipsApi } from "@/api";
import { useActiveAgency } from "@/context/AgencyContext";
import { useAuth } from "@/context/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import { cn } from "@/lib/utils";

/**
 * Selector de subcuenta estilo GHL: cambia la agencia activa y con ella el
 * alcance de los datos que muestra el panel.
 *
 * Alcance de acceso (solo UI): se listan las agencias que el usuario posee o
 * donde es miembro. Si no las abarca todas (acceso de subcuenta), se oculta
 * "Todas las agencias" y se fuerza una agencia accesible como activa.
 */
export function AgencySwitcher() {
  const { activeAgencyId, setActiveAgencyId } = useActiveAgency();
  const { session } = useAuth();
  const { data } = usePageData(() =>
    Promise.all([agenciesApi.list(), membershipsApi.list()]),
  );
  const [agencies, memberships] = data ?? [[], []];
  const userId = session?.user.id ?? "";

  // Agencias que el usuario posee o donde es miembro.
  const accessible = useMemo(() => {
    const memberAgencyIds = new Set(
      memberships
        .filter((membership) => membership.user_id === userId)
        .map((membership) => membership.agency_id),
    );
    const scoped = agencies.filter(
      (agency) => agency.user_id === userId || memberAgencyIds.has(agency.id),
    );
    // Si no está conectado a ninguna, no lo dejamos sin acceso: muestra todas.
    return scoped.length > 0 ? scoped : agencies;
  }, [agencies, memberships, userId]);

  const accessibleIds = useMemo(
    () => new Set(accessible.map((agency) => agency.id)),
    [accessible],
  );
  // Acceso "de agencia": puede ver todas las subcuentas de la red.
  const hasFullAccess =
    agencies.length > 0 && accessible.length === agencies.length;

  const activeAgency =
    agencies.find((agency) => agency.id === activeAgencyId) ?? null;

  // Un usuario de subcuenta no puede quedarse en "Todas" (mostraría todo):
  // si su agencia activa no es accesible, se selecciona la primera accesible.
  useEffect(() => {
    if (agencies.length === 0 || hasFullAccess) {
      return;
    }
    if (!activeAgencyId || !accessibleIds.has(activeAgencyId)) {
      setActiveAgencyId(accessible[0]?.id ?? null);
    }
  }, [
    agencies.length,
    hasFullAccess,
    activeAgencyId,
    accessibleIds,
    accessible,
    setActiveAgencyId,
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-9 max-w-56 items-center gap-2 rounded-full border border-border bg-background px-3.5 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {activeAgency ? (
              <Building2
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            ) : (
              <Globe
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <span className="truncate">
              {activeAgency?.name ?? "Todas las agencias"}
            </span>
            <ChevronsUpDown
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Subcuenta activa</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {hasFullAccess && (
          <DropdownMenuItem onClick={() => setActiveAgencyId(null)}>
            <Globe aria-hidden="true" />
            Todas las agencias
            <Check
              className={cn(
                "ml-auto",
                activeAgencyId === null ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
            />
          </DropdownMenuItem>
        )}
        {accessible.map((agency) => (
          <DropdownMenuItem
            key={agency.id}
            onClick={() => setActiveAgencyId(agency.id)}
          >
            <Building2 aria-hidden="true" />
            <span className="grid gap-0">
              <span className="truncate">{agency.name}</span>
              <span className="text-xs text-muted-foreground">
                {agency.location}
              </span>
            </span>
            <Check
              className={cn(
                "ml-auto",
                activeAgencyId === agency.id ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
