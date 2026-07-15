import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookUser,
  Boxes,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
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
import { roleLabel } from "@/lib/roles";

const navigationItems = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users },
  { to: "/admin/agencias", label: "Agencias", icon: Building2 },
  { to: "/admin/envios", label: "Envíos", icon: Package },
  { to: "/admin/paquetes", label: "Paquetes", icon: Boxes },
  { to: "/admin/contactos", label: "Contactos", icon: BookUser },
];

function BrandMark() {
  return (
    <div className="flex h-16 items-center gap-2.5 px-5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Package className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-[17px] font-medium tracking-tight">
        Dr Logistics
      </span>
    </div>
  );
}

function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
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
              "flex h-10 items-center gap-3 rounded-full px-4 text-sm font-medium text-sidebar-foreground/75 transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              isActive &&
                "bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )
          }
        >
          <item.icon className="size-4.5" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <BrandMark />
        <div className="flex-1 py-3">
          <NavigationList />
        </div>
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          Proyecto MVC · Sección 1 · Grupo E10
        </p>
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
          </div>

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
              <DropdownMenuItem onClick={logout}>
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
