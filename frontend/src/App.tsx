import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginPage } from "@/pages/LoginPage";
import { UsersPage } from "@/pages/UsersPage";
import { AgenciesPage } from "@/pages/AgenciesPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PackagesPage } from "@/pages/PackagesPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { AuditPage } from "@/pages/AuditPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ConfigurationPage } from "@/pages/ConfigurationPage";
import { RolesPage } from "@/pages/RolesPage";
import { TagsPage } from "@/pages/TagsPage";
import { EmailBuilderPage } from "@/pages/EmailBuilderPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PackageTrackingPage } from "@/pages/PackageTrackingPage";
import { PublicTrackingPage } from "@/pages/PublicTrackingPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { PasswordResetPage } from "@/pages/PasswordResetPage";
import { MagicLinkPage } from "@/pages/MagicLinkPage";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { AutomationsPage } from "@/pages/AutomationsPage";

// Editores pesados (TipTap, React Flow): se cargan bajo demanda para no
// inflar el bundle inicial de las vistas de tablas.
const EmailTemplateEditorPage = lazy(() =>
  import("@/pages/EmailTemplateEditorPage").then((m) => ({
    default: m.EmailTemplateEditorPage,
  })),
);
const AutomationEditorPage = lazy(() =>
  import("@/pages/AutomationEditorPage").then((m) => ({
    default: m.AutomationEditorPage,
  })),
);
// Diagrama ER: carga mermaid bajo demanda, fuera del bundle inicial.
const DiagramPage = lazy(() =>
  import("@/pages/DiagramPage").then((m) => ({ default: m.DiagramPage })),
);

function EditorFallback() {
  return (
    <div className="flex h-svh flex-col gap-4 bg-background px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="flex-1 rounded-xl" />
    </div>
  );
}

// Acceso al panel: administrador de agencia y administrador de sede.
const STAFF_ROLES = new Set(["ADMIN", "SUPERADMIN", "DISTRIBUTOR"]);

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  if (!session || !STAFF_ROLES.has(session.user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/track" element={<PublicTrackingPage />} />
      <Route path="/track/:code" element={<PublicTrackingPage />} />
      {/* Alias público /tracking → misma página de rastreo por guía. */}
      <Route path="/tracking" element={<PublicTrackingPage />} />
      <Route path="/tracking/:code" element={<PublicTrackingPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/verify/:token" element={<VerifyEmailPage />} />
      <Route path="/forgot" element={<PasswordResetPage />} />
      <Route path="/reset/:token" element={<PasswordResetPage />} />
      <Route path="/magic/:token" element={<MagicLinkPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AppLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="agencies" element={<AgenciesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route
          path="packages/:trackingCode"
          element={<PackageTrackingPage />}
        />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="templates" element={<EmailBuilderPage />} />
        <Route path="automations" element={<AutomationsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:contactId" element={<ContactDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="configuration" element={<ConfigurationPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route
          path="diagram"
          element={
            <Suspense fallback={<EditorFallback />}>
              <DiagramPage />
            </Suspense>
          }
        />
      </Route>
      {/* Editores a pantalla completa, sin el marco del panel. */}
      <Route
        path="/admin/automations/editor/:automationId"
        element={
          <RequireAdmin>
            <Suspense fallback={<EditorFallback />}>
              <div className="flex h-svh flex-col bg-background px-4 py-4 md:px-6 md:py-5">
                <AutomationEditorPage />
              </div>
            </Suspense>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/templates/editor/:templateId"
        element={
          <RequireAdmin>
            <Suspense fallback={<EditorFallback />}>
              <div className="flex h-svh flex-col bg-background px-4 py-4 md:px-6 md:py-5">
                <EmailTemplateEditorPage />
              </div>
            </Suspense>
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
