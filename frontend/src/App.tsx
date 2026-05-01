import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgencyFormPage } from "./components/AgencyFormPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminShell } from "./components/AdminShell";
import { LoginPage } from "./components/LoginPage";
import { UserFormPage } from "./components/UserFormPage";
import {
  agenciesApi,
  ApiRequestError,
  authApi,
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  usersApi,
} from "./api";
import { roleLabel } from "./lib/roles";
import type {
  Agency,
  AuthSession,
  CreateAgencyPayload,
  CreateUserPayload,
  LoginPayload,
  UpdateUserPayload,
  User,
} from "./types";

type AdminPath = "/admin" | "/admin/users/new" | "/admin/agencies/new";
type AppPath = "/" | AdminPath;

const emptyLoginForm: LoginPayload = {
  email: "",
  password: "",
};

const emptyForm: CreateUserPayload = {
  email: "",
  password: "",
  role: "USER",
};

const emptyAgencyForm: CreateAgencyPayload = {
  name: "",
  location: "",
  user_id: "",
};

const emptyAgencyOwnerForm: CreateUserPayload = {
  email: "",
  password: "",
  role: "DISTRIBUTOR",
};

function normalizePath(pathname: string): AppPath {
  if (
    pathname === "/admin" ||
    pathname === "/admin/users/new" ||
    pathname === "/admin/agencies/new"
  ) {
    return pathname;
  }

  return "/";
}

function getCurrentPath(): AppPath {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}

function App() {
  const [path, setPath] = useState<AppPath>(() => getCurrentPath());
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredSession(),
  );
  const [loginForm, setLoginForm] = useState<LoginPayload>(emptyLoginForm);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [agencyForm, setAgencyForm] =
    useState<CreateAgencyPayload>(emptyAgencyForm);
  const [agencyOwnerForm, setAgencyOwnerForm] =
    useState<CreateUserPayload>(emptyAgencyOwnerForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [isSavingAgencyOwner, setIsSavingAgencyOwner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [agencyMessage, setAgencyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agencyError, setAgencyError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [agencySearch, setAgencySearch] = useState("");

  const isAdminSession = session?.user.role === "ADMIN";

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.role.toLowerCase().includes(normalizedSearch),
    );
  }, [search, users]);

  const filteredAgencies = useMemo(() => {
    const normalizedSearch = agencySearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return agencies;
    }

    return agencies.filter((agency) => {
      const owner = userById.get(agency.user_id);

      return (
        agency.name.toLowerCase().includes(normalizedSearch) ||
        agency.location.toLowerCase().includes(normalizedSearch) ||
        owner?.email.toLowerCase().includes(normalizedSearch) ||
        roleLabel(owner?.role ?? "USER")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [agencySearch, agencies, userById]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      distributors: users.filter((user) => user.role === "DISTRIBUTOR").length,
      agencies: agencies.length,
      activeAgencies: agencies.filter((agency) => agency.is_active).length,
    }),
    [agencies, users],
  );

  const selectedAgencyOwner = useMemo(
    () => users.find((user) => user.id === agencyForm.user_id) ?? null,
    [agencyForm.user_id, users],
  );

  function navigate(nextPath: AppPath, replace = false) {
    if (typeof window === "undefined") {
      return;
    }

    const currentPath = getCurrentPath();

    if (currentPath !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", nextPath);
    }

    setPath(nextPath);
  }

  function navigateAdmin(nextPath: AdminPath, replace = false) {
    navigate(nextPath, replace);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
  }

  function resetAgencyForm() {
    setAgencyForm((currentForm) => ({
      ...emptyAgencyForm,
      user_id: currentForm.user_id,
    }));
  }

  function resetAgencyRouteState() {
    resetAgencyForm();
    setAgencyOwnerForm(emptyAgencyOwnerForm);
    setAgencyError(null);
    setAgencyMessage(null);
  }

  function handleUnauthorized(
    message:
      | string
      | null = "Tu sesión ya no es válida. Inicia sesión de nuevo.",
  ) {
    clearStoredSession();
    setSession(null);
    setUsers([]);
    setAgencies([]);
    setMessage(null);
    setAgencyMessage(null);
    setError(null);
    setAgencyError(null);
    setDashboardError(null);
    setAuthError(message);
    resetForm();
    resetAgencyRouteState();
    navigate("/", true);
  }

  async function loadAdminData() {
    setIsLoading(true);
    setDashboardError(null);

    try {
      const [nextUsers, nextAgencies] = await Promise.all([
        usersApi.list(),
        agenciesApi.list(),
      ]);
      setUsers(nextUsers);
      setAgencies(nextAgencies);
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        handleUnauthorized(caughtError.message);
        return;
      }

      setDashboardError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudieron cargar los datos del panel.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    function handlePopState() {
      setPath(getCurrentPath());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      clearStoredSession();
      setSession(null);
      return;
    }

    if (!isAdminSession && path !== "/") {
      navigate("/", true);
      return;
    }

    if (isAdminSession && path === "/") {
      navigate("/admin", true);
    }
  }, [isAdminSession, path, session]);

  useEffect(() => {
    if (path !== "/" && isAdminSession) {
      void loadAdminData();
    }
  }, [isAdminSession, path]);

  useEffect(() => {
    setAgencyForm((currentForm) => {
      if (users.length === 0) {
        return currentForm.user_id
          ? { ...currentForm, user_id: "" }
          : currentForm;
      }

      const hasSelectedOwner = users.some(
        (user) => user.id === currentForm.user_id,
      );

      if (hasSelectedOwner) {
        return currentForm;
      }

      return {
        ...currentForm,
        user_id: users[0].id,
      };
    });
  }, [users]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const nextSession = await authApi.login(loginForm);

      if (nextSession.user.role !== "ADMIN") {
        clearStoredSession();
        setSession(null);
        setAuthError("Necesitas una cuenta ADMIN para entrar al panel.");
        return;
      }

      setStoredSession(nextSession);
      setSession(nextSession);
      setLoginForm(emptyLoginForm);
      navigate("/admin");
    } catch (caughtError) {
      setAuthError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    handleUnauthorized(null);
  }

  function goToDashboard() {
    resetForm();
    resetAgencyRouteState();
    navigateAdmin("/admin");
  }

  function openCreateUserPage() {
    resetForm();
    setMessage(null);
    setError(null);
    navigateAdmin("/admin/users/new");
  }

  function openCreateAgencyPage() {
    resetAgencyRouteState();
    navigateAdmin("/admin/agencies/new");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (editingUser) {
        const updatedUserPayload: UpdateUserPayload = {
          email: form.email,
          password: form.password,
        };
        const updatedUser = await usersApi.update(
          editingUser.id,
          updatedUserPayload,
        );

        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === editingUser.id ? updatedUser : user,
          ),
        );
        setMessage("Usuario actualizado correctamente.");
        setEditingUser(null);
        setForm(emptyForm);
      } else {
        const createdUser = await usersApi.create(form);
        setUsers((currentUsers) => [createdUser, ...currentUsers]);
        setMessage("Usuario creado correctamente.");
        setForm(emptyForm);
      }
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        handleUnauthorized(caughtError.message);
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo guardar el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAgencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingAgency(true);
    setAgencyError(null);
    setAgencyMessage(null);

    try {
      const createdAgency = await agenciesApi.create(agencyForm);
      setAgencies((currentAgencies) => [createdAgency, ...currentAgencies]);
      setAgencyMessage("Agencia creada correctamente.");
      resetAgencyForm();
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        handleUnauthorized(caughtError.message);
        return;
      }

      setAgencyError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear la agencia.",
      );
    } finally {
      setIsSavingAgency(false);
    }
  }

  async function handleAgencyOwnerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingAgencyOwner(true);
    setAgencyError(null);
    setAgencyMessage(null);

    try {
      const createdUser = await usersApi.create(agencyOwnerForm);
      setUsers((currentUsers) => [createdUser, ...currentUsers]);
      setAgencyForm((currentForm) => ({
        ...currentForm,
        user_id: createdUser.id,
      }));
      setAgencyOwnerForm(emptyAgencyOwnerForm);
      setAgencyMessage(
        "Usuario responsable creado y seleccionado para la agencia.",
      );
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        handleUnauthorized(caughtError.message);
        return;
      }

      setAgencyError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo crear el usuario responsable.",
      );
    } finally {
      setIsSavingAgencyOwner(false);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: "",
      role: user.role,
    });
    setMessage(null);
    setError(null);
    navigateAdmin("/admin/users/new");
  }

  async function handleDelete(user: User) {
    const shouldDelete = window.confirm(`¿Eliminar el usuario ${user.email}?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await usersApi.remove(user.id);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
      setMessage("Usuario eliminado correctamente.");

      if (editingUser?.id === user.id) {
        resetForm();
      }
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        (caughtError.statusCode === 401 || caughtError.statusCode === 403)
      ) {
        handleUnauthorized(caughtError.message);
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo eliminar el usuario.",
      );
    }
  }

  function handleLoginFieldChange(field: keyof LoginPayload, value: string) {
    setLoginForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleUserFieldChange(
    field: keyof CreateUserPayload,
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleAgencyFieldChange(
    field: keyof CreateAgencyPayload,
    value: string,
  ) {
    setAgencyForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleAgencyOwnerFieldChange(
    field: keyof CreateUserPayload,
    value: string,
  ) {
    setAgencyOwnerForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  if (path === "/" || !isAdminSession) {
    return (
      <LoginPage
        authError={authError}
        isLoggingIn={isLoggingIn}
        loginForm={loginForm}
        onLoginFieldChange={handleLoginFieldChange}
        onSubmit={handleLogin}
      />
    );
  }

  if (path === "/admin/users/new") {
    return (
      <AdminShell
        currentPath={path}
        description="Abre nuevas cuentas para operadores, responsables de agencia o administradores que coordinan la red de envíos Domesa."
        isLoading={isLoading}
        onLogout={handleLogout}
        onNavigate={navigateAdmin}
        session={session}
        title={
          editingUser ? "Editar usuario operativo" : "Nuevo usuario Domesa"
        }
      >
        <UserFormPage
          editingUser={editingUser}
          error={error}
          form={form}
          isSaving={isSaving}
          message={message}
          onBack={goToDashboard}
          onFieldChange={handleUserFieldChange}
          onRoleChange={(role) => handleUserFieldChange("role", role)}
          onSubmit={handleSubmit}
        />
      </AdminShell>
    );
  }

  if (path === "/admin/agencies/new") {
    return (
      <AdminShell
        currentPath={path}
        description="Registra sucursales, asigna responsables y expande la cobertura operativa de Domesa con una pantalla propia para agencias."
        isLoading={isLoading}
        onLogout={handleLogout}
        onNavigate={navigateAdmin}
        session={session}
        title="Nueva agencia Domesa"
      >
        <AgencyFormPage
          agencyError={agencyError}
          agencyForm={agencyForm}
          agencyMessage={agencyMessage}
          agencyOwnerForm={agencyOwnerForm}
          isSavingAgency={isSavingAgency}
          isSavingAgencyOwner={isSavingAgencyOwner}
          onAgencyFieldChange={handleAgencyFieldChange}
          onAgencyOwnerFieldChange={handleAgencyOwnerFieldChange}
          onAgencyOwnerRoleChange={(role) =>
            handleAgencyOwnerFieldChange("role", role)
          }
          onAgencyOwnerSubmit={handleAgencyOwnerSubmit}
          onAgencySubmit={handleAgencySubmit}
          onBack={goToDashboard}
          selectedOwner={selectedAgencyOwner}
          users={users}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      currentPath={path}
      description="Controla operadores, sucursales y responsables desde un panel visual inspirado en una red nacional de encomiendas y última milla."
      isLoading={isLoading}
      onLogout={handleLogout}
      onNavigate={navigateAdmin}
      onRefresh={() => void loadAdminData()}
      session={session}
      title="Centro de operaciones Domesa"
    >
      <AdminDashboard
        agenciesSection={{
          agencySearch,
          filteredAgencies,
          isLoading,
          onAgencySearchChange: setAgencySearch,
          onCreateAgency: openCreateAgencyPage,
          userById,
        }}
        dashboardError={dashboardError}
        isLoading={isLoading}
        stats={stats}
        usersSection={{
          error,
          filteredUsers,
          isLoading,
          message,
          onCreateUser: openCreateUserPage,
          onDelete: (user) => void handleDelete(user),
          onEdit: startEdit,
          onSearchChange: setSearch,
          search,
        }}
      />
    </AdminShell>
  );
}

export default App;
