import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Banknote,
  BookUser,
  Boxes,
  Building2,
  Cog,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  FileBarChart2,
  Package,
  PanelLeft,
  ScrollText,
  ShieldCheck,
  Settings,
  Sun,
  Tag,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { roleLabel } from "@/lib/roles";
import { AgencySwitcher } from "@/components/layout/AgencySwitcher";
import { NotificationBell } from "@/components/layout/NotificationBell";

const navigationItems = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/agencies", label: "Agencias", icon: Building2 },
  { to: "/admin/orders", label: "Envíos", icon: Package },
  { to: "/admin/packages", label: "Paquetes", icon: Boxes },
  { to: "/admin/payments", label: "Transacciones", icon: Banknote },
  { to: "/admin/contacts", label: "Contactos", icon: BookUser },
  { to: "/admin/tags", label: "Etiquetas", icon: Tag },
  { to: "/admin/templates", label: "Plantillas", icon: Mail },
  { to: "/admin/conversations", label: "Conversaciones", icon: MessageCircle },
  { to: "/admin/automations", label: "Automatizaciones", icon: Workflow },
  { to: "/admin/reports", label: "Reportes", icon: FileBarChart2 },
  { to: "/admin/audit", label: "Auditoría", icon: ScrollText },
  { to: "/admin/roles", label: "Roles y permisos", icon: ShieldCheck },
  { to: "/admin/configuration", label: "Configuración", icon: Cog },
];

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2.5",
        collapsed ? "justify-center px-0" : "px-5",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Package className="size-4.5" aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className="text-lg font-medium tracking-tight">
          Dr Logistics
        </span>
      )}
    </div>
  );
}

function NavigationList({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-1 px-3">
      {navigationItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group/nav relative flex h-10 items-center gap-3 rounded-full text-sm font-medium text-sidebar-foreground/75 transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              collapsed ? "justify-center px-0" : "px-4",
              isActive &&
                "bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )
          }
        >
          <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
          {!collapsed && item.label}
          {collapsed && (
            <>
              <span className="sr-only">{item.label}</span>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-1/2 left-full z-50 ml-2.5 -translate-y-1/2 translate-x-1 scale-95 rounded-md bg-popover px-2.5 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md ring-1 ring-foreground/10 transition-[opacity,transform] duration-150 group-hover/nav:translate-x-0 group-hover/nav:scale-100 group-hover/nav:opacity-100 group-focus-visible/nav:translate-x-0 group-focus-visible/nav:scale-100 group-focus-visible/nav:opacity-100 motion-reduce:transition-none"
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const SIDEBAR_COLLAPSED_KEY = "dr-logistics-sidebar-collapsed";

/** Rutas que aprovechan todo el ancho de la pantalla. */
const FULL_BLEED_PREFIXES = ["/admin/conversations", "/admin/automations"];

export function AppLayout() {
  const { session, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isFullBleed = FULL_BLEED_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  const currentItem = [...navigationItems]
    .reverse()
    .find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    );

  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-svh bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <BrandMark collapsed={isCollapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <NavigationList collapsed={isCollapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Abrir navegación"
                  >
                    <Menu aria-hidden="true" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navegación</SheetTitle>
                <BrandMark />
                <div className="py-3">
                  <NavigationList onNavigate={() => setIsMobileNavOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-lg font-medium tracking-tight md:sr-only">
              {currentItem?.label ?? "Panel"}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={
                isCollapsed ? "Expandir navegación" : "Colapsar navegación"
              }
              onClick={toggleCollapsed}
            >
              <PanelLeft aria-hidden="true" />
            </Button>
            <div className="hidden md:block">
              <AgencySwitcher />
            </div>
          </div>

          <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mode === "dark" ? "Modo claro" : "Modo oscuro"}
            onClick={toggleMode}
          >
            {mode === "dark" ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label={`Cuenta: ${email}`}
                  className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary transition-colors outline-none hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {initials}
                </button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="grid gap-0.5">
                    <span className="truncate font-medium">{email}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session ? roleLabel(session.user.role) : ""}
                    </span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<NavLink to="/admin/settings" />}>
                <Settings aria-hidden="true" />
                Ajustes de cuenta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main
          className={cn(
            "flex flex-1 flex-col",
            isFullBleed ? "px-4 py-4 md:px-6 md:py-5" : "px-4 py-6 md:px-8 md:py-8",
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-full flex-1 flex-col",
              isFullBleed ? "max-w-none" : "max-w-6xl",
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
