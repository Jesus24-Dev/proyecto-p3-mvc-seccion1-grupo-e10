import { useMemo, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { agenciesApi, contactsApi, usersApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useActiveAgency } from "@/context/AgencyContext";
import { useTheme } from "@/context/ThemeContext";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { ACCENT_PRESETS, DEFAULT_THEME } from "@/lib/themes";
import { toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgencyTheme } from "@/types";

const RADIUS_OPTIONS = [
  { value: 0, label: "Recto" },
  { value: 0.375, label: "Suave" },
  { value: 0.625, label: "Redondeado" },
  { value: 1, label: "Muy redondeado" },
];

export function SettingsPage() {
  const { session } = useAuth();
  const { activeAgencyId } = useActiveAgency();
  const { setAgencyTheme } = useTheme();
  const runMutation = useMutationHandler();
  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([contactsApi.list(), agenciesApi.list()]),
  );
  const [contacts, agencies] = data ?? [[], []];

  const userId = session?.user.id ?? "";
  const myContact = useMemo(
    () => contacts.find((contact) => contact.user_id === userId) ?? null,
    [contacts, userId],
  );
  const activeAgency = useMemo(
    () =>
      (activeAgencyId
        ? agencies.find((agency) => agency.id === activeAgencyId)
        : undefined) ?? null,
    [agencies, activeAgencyId],
  );

  // --- Perfil ---
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    address: "",
    birthday: "",
    email: "",
  });
  const [profileMsg, setProfileMsg] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Rellena el formulario cuando llegan los datos (ajuste de estado durante el
  // render al cambiar la identidad, no en un efecto).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (!isLoading && loadedFor !== userId) {
    setLoadedFor(userId);
    setProfile({
      first_name: myContact?.first_name ?? "",
      last_name: myContact?.last_name ?? "",
      address: myContact?.address ?? "",
      birthday: myContact ? toDateInputValue(myContact.birthday) : "",
      email: session?.user.email ?? "",
    });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const failure = await runMutation(async () => {
      if (myContact) {
        await contactsApi.update(userId, {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          address: profile.address.trim(),
          birthday: profile.birthday,
        });
      }
      if (profile.email.trim() && profile.email.trim() !== session?.user.email) {
        await usersApi.update(userId, { email: profile.email.trim() });
      }
    });
    setProfileSaving(false);
    setProfileMsg(
      failure
        ? { text: failure, tone: "danger" }
        : {
            text:
              "Perfil actualizado. Si cambiaste el correo, se usará al iniciar sesión de nuevo.",
            tone: "success",
          },
    );
    void reload();
  }

  // --- Contraseña ---
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (password.next.length < 8) {
      setPasswordMsg({
        text: "La contraseña debe tener al menos 8 caracteres.",
        tone: "danger",
      });
      return;
    }
    if (password.next !== password.confirm) {
      setPasswordMsg({ text: "Las contraseñas no coinciden.", tone: "danger" });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    const failure = await runMutation(async () => {
      await usersApi.update(userId, {
        email: session?.user.email ?? profile.email,
        password: password.next,
      });
    });
    setPasswordSaving(false);
    if (failure) {
      setPasswordMsg({ text: failure, tone: "danger" });
      return;
    }
    setPassword({ next: "", confirm: "" });
    setPasswordMsg({ text: "Contraseña actualizada.", tone: "success" });
  }

  // --- Tema de la subcuenta ---
  const [themeDraft, setThemeDraft] = useState<AgencyTheme>(DEFAULT_THEME);
  const [themeMsg, setThemeMsg] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeLoadedFor, setThemeLoadedFor] = useState<string | null>(null);

  const themeKey = activeAgency?.id ?? "__none__";
  if (themeLoadedFor !== themeKey) {
    setThemeLoadedFor(themeKey);
    setThemeDraft(activeAgency?.theme ?? DEFAULT_THEME);
  }

  async function saveTheme() {
    if (!activeAgency) {
      return;
    }
    setThemeSaving(true);
    setThemeMsg(null);
    const failure = await runMutation(async () => {
      await agenciesApi.updateTheme(activeAgency.id, themeDraft);
      if (activeAgencyId === activeAgency.id) {
        setAgencyTheme(themeDraft);
      }
    });
    setThemeSaving(false);
    setThemeMsg(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Apariencia guardada.", tone: "success" },
    );
    void reload();
  }

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <div className="grid gap-6">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Gestiona tu perfil, tu contraseña y la apariencia de la subcuenta activa."
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mi perfil</CardTitle>
            <CardDescription>
              Tus datos de contacto y correo de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4">
              {profileMsg && (
                <Alert
                  variant={profileMsg.tone === "danger" ? "destructive" : "default"}
                >
                  <AlertDescription>{profileMsg.text}</AlertDescription>
                </Alert>
              )}
              {!myContact && (
                <p className="text-xs text-muted-foreground">
                  Tu cuenta no tiene ficha de contacto; solo puedes cambiar el
                  correo aquí.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="profile-first">Nombre</Label>
                  <Input
                    id="profile-first"
                    value={profile.first_name}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, first_name: event.target.value }))
                    }
                    disabled={!myContact}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-last">Apellido</Label>
                  <Input
                    id="profile-last"
                    value={profile.last_name}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, last_name: event.target.value }))
                    }
                    disabled={!myContact}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-address">Dirección</Label>
                <Input
                  id="profile-address"
                  value={profile.address}
                  onChange={(event) =>
                    setProfile((c) => ({ ...c, address: event.target.value }))
                  }
                  disabled={!myContact}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="profile-birthday">Nacimiento</Label>
                  <Input
                    id="profile-birthday"
                    type="date"
                    value={profile.birthday}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, birthday: event.target.value }))
                    }
                    disabled={!myContact}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-email">Correo</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((c) => ({ ...c, email: event.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="justify-self-start"
                disabled={profileSaving}
              >
                {profileSaving ? "Guardando…" : "Guardar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contraseña</CardTitle>
              <CardDescription>Cambia tu contraseña de acceso.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="grid gap-4">
                {passwordMsg && (
                  <Alert
                    variant={
                      passwordMsg.tone === "danger" ? "destructive" : "default"
                    }
                  >
                    <AlertDescription>{passwordMsg.text}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="password-next">Nueva contraseña</Label>
                  <Input
                    id="password-next"
                    type="password"
                    value={password.next}
                    onChange={(event) =>
                      setPassword((c) => ({ ...c, next: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-confirm">Confirmar</Label>
                  <Input
                    id="password-confirm"
                    type="password"
                    value={password.confirm}
                    onChange={(event) =>
                      setPassword((c) => ({ ...c, confirm: event.target.value }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="justify-self-start"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? "Guardando…" : "Cambiar contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apariencia de la subcuenta</CardTitle>
              <CardDescription>
                {activeAgency
                  ? `Color y forma de ${activeAgency.name}.`
                  : "Elige una subcuenta activa para personalizar su apariencia."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {themeMsg && (
                <Alert
                  variant={themeMsg.tone === "danger" ? "destructive" : "default"}
                >
                  <AlertDescription>{themeMsg.text}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label>Color de acento</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-label={preset.label}
                      aria-pressed={themeDraft.accent === preset.id}
                      disabled={!activeAgency}
                      onClick={() =>
                        setThemeDraft((current) => ({
                          ...current,
                          accent: preset.id,
                        }))
                      }
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border-2 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
                        themeDraft.accent === preset.id
                          ? "border-foreground"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: preset.swatch }}
                    >
                      {themeDraft.accent === preset.id && (
                        <Check className="size-4 text-white" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Forma</Label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={
                        themeDraft.radius === option.value ? "default" : "outline"
                      }
                      size="sm"
                      disabled={!activeAgency}
                      onClick={() =>
                        setThemeDraft((current) => ({
                          ...current,
                          radius: option.value,
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                className="justify-self-start"
                disabled={!activeAgency || themeSaving}
                onClick={() => void saveTheme()}
              >
                {themeSaving ? "Guardando…" : "Guardar apariencia"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
