import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline }   from '@mui/material';
import theme from './styles/theme';

import LandingPage            from './pages/LandingPage';
import LoginPage              from './pages/LoginPage';
import PrivateRoute           from './components/PrivateRoute';
import MainLayout             from './components/layout/MainLayout';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';

// Pages communes (admin + pharmacien)
import InventairePage         from './pages/admin/InventairePage';
import MedicamentDetailPage   from './pages/admin/MedicamentDetailPage';
import FournisseursPage       from './pages/admin/FournisseursPage';
import CommandesPage          from './pages/admin/CommandesPage';
import AlertesPage            from './pages/admin/AlertesPage';

// Pages admin uniquement
import MedicamentFormPage     from './pages/admin/MedicamentFormPage';
import DashboardPage          from './pages/admin/DashboardPage';
import RapportPage            from './pages/admin/RapportPage';
import InventairePhysiquePage from './pages/admin/InventairePhysiquePage';
import HistoriquePage         from './pages/admin/HistoriquePage';
import UtilisateursPage       from './pages/admin/UtilisateursPage';
import ParametresPage         from './pages/admin/ParametresPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* ── Publiques ── */}
          <Route path="/"      element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />

          {/* ── Zone protégée — même layout pour admin ET pharmacien ── */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            {/* Index → redirige selon rôle (géré dans MainLayout ou LoginPage) */}
            <Route index element={<Navigate to="inventaire" replace />} />

            {/*  COMMUN (admin + pharmacien) */}
            <Route path="inventaire"     element={<InventairePage />} />
            <Route path="inventaire/:id" element={<MedicamentDetailPage />} />
            <Route path="fournisseurs"   element={<FournisseursPage />} />
            <Route path="commandes"      element={<CommandesPage />} />
            <Route path="alertes"        element={<AlertesPage />} />
            <Route path="historique"     element={<HistoriquePage />} />
            

            {/* ADMIN UNIQUEMENT  */}
            <Route
              path="tableau-de-bord"
              element={<PrivateRoute adminOnly><DashboardPage /></PrivateRoute>}
            />
            <Route
              path="inventaire/nouveau"
              element={<PrivateRoute adminOnly><MedicamentFormPage /></PrivateRoute>}
            />
            <Route
              path="inventaire/:id/modifier"
              element={<PrivateRoute adminOnly><MedicamentFormPage /></PrivateRoute>}
            />
            <Route
              path="inventaire-physique"
              element={<PrivateRoute adminOnly><InventairePhysiquePage /></PrivateRoute>}
            />
            <Route
              path="rapports"
              element={<PrivateRoute adminOnly><RapportPage /></PrivateRoute>}
            />
            <Route
              path="utilisateurs"
              element={<PrivateRoute adminOnly><UtilisateursPage /></PrivateRoute>}
            />
            <Route
              path="parametres"
              element={<PrivateRoute adminOnly><ParametresPage /></PrivateRoute>}
            />
          </Route>

          {/* Anciennes URLs → redirection */}
          <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
          <Route path="/pharmacien/*"    element={<Navigate to="/admin/inventaire" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}