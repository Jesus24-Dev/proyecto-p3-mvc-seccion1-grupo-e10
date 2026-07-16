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
import { PaymentsPage } from "@/pages/PaymentsPage";
import { AuditPage } from "@/pages/AuditPage";
import { TagsPage } from "@/pages/TagsPage";
import { EmailBuilderPage } from "@/pages/EmailBuilderPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PackageTrackingPage } from "@/pages/PackageTrackingPage";
import { PublicTrackingPage } from "@/pages/PublicTrackingPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
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

function EditorFallback() {
  return (
    <div className="flex h-svh flex-col gap-4 bg-background px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="flex-1 rounded-xl" />
    </div>
  );
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  if (session?.user.role !== "ADMIN") {
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
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/verify/:token" element={<VerifyEmailPage />} />
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
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
