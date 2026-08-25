import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/public/HomePage";
import { BookingPage } from "@/pages/public/BookingPage";
import { FullScreenLoader } from "@/components/ui/spinner";

// Área administrativa em chunks separados — o cliente que só agenda
// não baixa gráficos nem o painel.
const LoginPage = lazy(() =>
  import("@/pages/admin/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AdminLayout = lazy(() =>
  import("@/components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const RequireAuth = lazy(() =>
  import("@/components/admin/RequireAuth").then((m) => ({ default: m.RequireAuth })),
);
const DashboardPage = lazy(() =>
  import("@/pages/admin/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const AgendaPage = lazy(() =>
  import("@/pages/admin/AgendaPage").then((m) => ({ default: m.AgendaPage })),
);
const AppointmentsPage = lazy(() =>
  import("@/pages/admin/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })),
);
const ClientsPage = lazy(() =>
  import("@/pages/admin/ClientsPage").then((m) => ({ default: m.ClientsPage })),
);
const ClientDetailPage = lazy(() =>
  import("@/pages/admin/ClientDetailPage").then((m) => ({ default: m.ClientDetailPage })),
);
const ServicesPage = lazy(() =>
  import("@/pages/admin/ServicesPage").then((m) => ({ default: m.ServicesPage })),
);
const FixedSchedulesPage = lazy(() =>
  import("@/pages/admin/FixedSchedulesPage").then((m) => ({ default: m.FixedSchedulesPage })),
);
const FinancialPage = lazy(() =>
  import("@/pages/admin/FinancialPage").then((m) => ({ default: m.FinancialPage })),
);
const ReportsPage = lazy(() =>
  import("@/pages/admin/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/admin/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="agendamentos" element={<AppointmentsPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="clientes/:id" element={<ClientDetailPage />} />
            <Route path="servicos" element={<ServicesPage />} />
            <Route path="horarios-fixos" element={<FixedSchedulesPage />} />
            <Route path="financeiro" element={<FinancialPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
