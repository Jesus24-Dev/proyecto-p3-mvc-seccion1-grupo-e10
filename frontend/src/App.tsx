import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { UsersPage } from "@/pages/UsersPage";
import { AgenciesPage } from "@/pages/AgenciesPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PackagesPage } from "@/pages/PackagesPage";
import { TagsPage } from "@/pages/TagsPage";
import { EmailBuilderPage } from "@/pages/EmailBuilderPage";
import { EmailTemplateEditorPage } from "@/pages/EmailTemplateEditorPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PackageTrackingPage } from "@/pages/PackageTrackingPage";
import { PublicTrackingPage } from "@/pages/PublicTrackingPage";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { AutomationsPage } from "@/pages/AutomationsPage";
import { AutomationEditorPage } from "@/pages/AutomationEditorPage";

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
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Editores a pantalla completa, sin el marco del panel. */}
      <Route
        path="/admin/automations/editor/:automationId"
        element={
          <RequireAdmin>
            <div className="flex h-svh flex-col bg-background px-4 py-4 md:px-6 md:py-5">
              <AutomationEditorPage />
            </div>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/templates/editor/:templateId"
        element={
          <RequireAdmin>
            <div className="flex h-svh flex-col bg-background px-4 py-4 md:px-6 md:py-5">
              <EmailTemplateEditorPage />
            </div>
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
