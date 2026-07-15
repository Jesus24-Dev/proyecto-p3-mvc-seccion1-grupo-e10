import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { UsersPage } from "@/pages/UsersPage";
import { AgenciesPage } from "@/pages/AgenciesPage";

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
        <Route index element={<PlaceholderPage title="Dashboard" />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="agencias" element={<AgenciesPage />} />
        <Route path="envios" element={<PlaceholderPage title="Envíos" />} />
        <Route
          path="contactos"
          element={<PlaceholderPage title="Contactos" />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
