import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { UsersPage } from "@/pages/UsersPage";
import { AgenciesPage } from "@/pages/AgenciesPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PackagesPage } from "@/pages/PackagesPage";
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
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AppLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="agencias" element={<AgenciesPage />} />
        <Route path="envios" element={<OrdersPage />} />
        <Route path="paquetes" element={<PackagesPage />} />
        <Route path="conversaciones" element={<ConversationsPage />} />
        <Route path="automatizaciones" element={<AutomationsPage />} />
        <Route
          path="automatizaciones/:automationId"
          element={<AutomationEditorPage />}
        />
        <Route path="contactos" element={<ContactsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
