import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './styles/theme';
import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import PrivateRoute      from './components/PrivateRoute';
import MainLayout        from './components/layout/MainLayout';
import InventairePage    from './pages/admin/InventairePage';
import MedicamentFormPage   from './pages/admin/MedicamentFormPage';
import FournisseursPage  from './pages/admin/FournisseursPage';
import MedicamentDetailPage from './pages/admin/MedicamentDetailPage';
import CommandesPage     from './pages/admin/CommandesPage';
import AlertesPage       from './pages/admin/AlertesPage';
import DashboardPage     from './pages/admin/DashboardPage';   // ← vrai tableau de bord
import RapportPage       from './pages/admin/RapportPage';     // ← ex-DashboardPage
import InventairePhysiquePage from './pages/admin/InventairePhysiquePage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ── Zone admin ──────────────────────────────────────────────── */}
          <Route path="/admin" element={
            <PrivateRoute><MainLayout /></PrivateRoute>
          }>
            {/* Index → Tableau de bord */}
            <Route index element={<DashboardPage />} />
            <Route path="tableau-de-bord" element={<DashboardPage />} />

            <Route path="inventaire"              element={<InventairePage />} />
            <Route path="inventaire/nouveau"      element={<MedicamentFormPage />} />
            <Route path="inventaire/:id"          element={<MedicamentDetailPage />} />
            <Route path="inventaire/:id/modifier" element={<MedicamentFormPage />} />

            <Route path="fournisseurs" element={<FournisseursPage />} />
            <Route path="commandes"    element={<CommandesPage />} />
            <Route path="alertes"      element={<AlertesPage />} />
            <Route path="rapports"     element={<RapportPage />} />  {/* ← ici */}
            <Route path="inventaire-physique" element={<InventairePhysiquePage />} />
          </Route>

          {/* ── Zone pharmacien ─────────────────────────────────────────── */}
          <Route path="/pharmacien" element={
            <PrivateRoute><MainLayout /></PrivateRoute>
          }>
            <Route path="inventaire/:id" element={<MedicamentDetailPage />} />
          </Route>

          {/* Redirection ancienne URL dashboard */}
          <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}