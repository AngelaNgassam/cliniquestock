import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './styles/theme';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import InventairePage from './pages/admin/InventairePage';
import MedicamentFormPage from './pages/admin/MedicamentFormPage';
import MedicamentDetailPage from './pages/admin/MedicamentDetailPage';

const DashboardAdmin = () => (
  <div style={{ padding: 20 }}>
    <h2 style={{ color: '#0D47A1' }}>Tableau de bord — En construction 🏗️</h2>
  </div>
);

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/dashboard/admin" element={
            <PrivateRoute><MainLayout /></PrivateRoute>
          }>
            <Route index element={<DashboardAdmin />} />
          </Route>

          <Route path="/admin" element={
            <PrivateRoute><MainLayout /></PrivateRoute>
          }>
            <Route path="inventaire" element={<InventairePage />} />
            <Route path="inventaire/nouveau" element={<MedicamentFormPage />} />
            {/* ✅ détail AVANT :id/modifier pour éviter conflit de route */}
            <Route path="inventaire/:id" element={<MedicamentDetailPage />} />
            <Route path="inventaire/:id/modifier" element={<MedicamentFormPage />} />
          </Route>

          <Route path="/pharmacien" element={
            <PrivateRoute><MainLayout /></PrivateRoute>
          }>
            <Route path="inventaire/:id" element={<MedicamentDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}