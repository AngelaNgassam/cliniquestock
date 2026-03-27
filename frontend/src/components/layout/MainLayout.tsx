import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Badge, InputBase, Tooltip, Divider, Chip,
} from '@mui/material';
import {
  Dashboard, Inventory2, LocalShipping, ShoppingCart,
  NotificationsNone, Assessment, People, Settings,
  Search, Menu as MenuIcon, Logout, AdminPanelSettings,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

const DRAWER_WIDTH = 220;

const navItems = [
  { label: 'Tableau de bord', icon: <Dashboard />, path: '/dashboard/admin' },
  { label: 'Inventaire',      icon: <Inventory2 />, path: '/admin/inventaire' },
  { label: 'Fournisseurs',    icon: <LocalShipping />, path: '/admin/fournisseurs' },
  { label: 'Commandes',       icon: <ShoppingCart />, path: '/admin/commandes' },
  { label: 'Alertes',         icon: <NotificationsNone />, path: '/admin/alertes' },
  { label: 'Rapports',        icon: <Assessment />, path: '/admin/rapports' },
  { label: 'Utilisateurs',    icon: <People />, path: '/admin/utilisateurs' },
  { label: 'Paramètres',      icon: <Settings />, path: '/admin/parametres' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0D47A1' }}>
      {/* Logo */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AdminPanelSettings sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Typography variant="h6" fontWeight={800} color="white" fontSize={16}>
          CliniqueStock
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard/admin' && location.pathname.startsWith(item.path));
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2, mb: 0.5, py: 1,
                bgcolor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.8)', minWidth: 36 }}>
                {item.label === 'Alertes'
                  ? <Badge badgeContent={3} color="error">{item.icon}</Badge>
                  : item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 13.5, fontWeight: isActive ? 700 : 400,
                  color: 'white',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* User info */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: '#2196F3', fontSize: 14 }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="white" fontWeight={600} noWrap fontSize={12}>
            {user?.prenom} {user?.nom}
          </Typography>
          <Chip label="Admin" size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, height: 18 }} />
        </Box>
        <Tooltip title="Se déconnecter">
          <IconButton onClick={handleLogout} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F4FF' }}>
      {/* Sidebar desktop */}
      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', boxSizing: 'border-box' },
      }}>
        {drawer}
      </Drawer>

      {/* Sidebar mobile */}
      <Drawer variant="temporary" open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}>
        {drawer}
      </Drawer>

      {/* Contenu principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <AppBar position="sticky" elevation={0} sx={{
          bgcolor: 'white', borderBottom: '1px solid #E3F2FD',
          zIndex: 1,
        }}>
          <Toolbar sx={{ gap: 2 }}>
            <IconButton sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>

            {/* Barre de recherche */}
            <Box sx={{
              flex: 1, maxWidth: 500,
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: '#F0F4FF', borderRadius: 2, px: 2, py: 0.8,
            }}>
              <Search sx={{ color: '#90A4AE', fontSize: 20 }} />
              <InputBase
                placeholder="Rechercher un médicament, lot, fournisseur..."
                sx={{ flex: 1, fontSize: 14 }}
              />
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* Notifications */}
            <IconButton>
              <Badge badgeContent={3} color="error">
                <NotificationsNone sx={{ color: '#546E7A' }} />
              </Badge>
            </IconButton>

            {/* Avatar user */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#2196F3', fontSize: 14 }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={600} color="#0D47A1" lineHeight={1.2}>
                  {user?.prenom} {user?.nom}
                </Typography>
                <Typography variant="caption" color="text.secondary">Admin</Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Pages */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}