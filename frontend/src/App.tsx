import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './styles/theme';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';

// Placeholders dashboard (à développer plus tard)
const DashboardAdmin = () => <div style={{padding:40, fontSize:24}}>Dashboard Admin 🏥</div>;
const DashboardPharmacien = () => <div style={{padding:40, fontSize:24}}>Dashboard Pharmacien 💊</div>;

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/admin" element={
            <PrivateRoute><DashboardAdmin /></PrivateRoute>
          } />
          <Route path="/dashboard/pharmacien" element={
            <PrivateRoute><DashboardPharmacien /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}