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
import { agenciesApi } from "@/api";
import { useActiveAgency } from "@/context/AgencyContext";
import { usePageData } from "@/hooks/usePageData";
import { cn } from "@/lib/utils";

/**
 * Selector de subcuenta estilo GHL: cambia la agencia activa y con ella
 * el alcance de los datos que muestra el panel.
 */
export function AgencySwitcher() {
  const { activeAgencyId, setActiveAgencyId } = useActiveAgency();
  const { data: agencies } = usePageData(agenciesApi.list);

  const activeAgency =
    agencies?.find((agency) => agency.id === activeAgencyId) ?? null;

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
        {(agencies ?? []).map((agency) => (
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
