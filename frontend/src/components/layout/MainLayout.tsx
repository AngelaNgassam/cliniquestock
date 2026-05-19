import { useState, useEffect } from 'react';
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
  Notifications, Inventory, History as HistoryIcon,
} from '@mui/icons-material';

import { useAuthStore } from '../../store/authStore';
import { useRole }      from '../../hooks/useRole';
import { authService }  from '../../services/authService';
import alerteService    from '../../services/alerteService';

const DRAWER_WIDTH = 220;

// ── Définition complète du menu avec flag adminOnly ───────────────────────────
const ALL_NAV_ITEMS = [
  // Admin uniquement
  { label: 'Tableau de bord',     icon: <Dashboard />,         path: '/admin/tableau-de-bord',     adminOnly: true  },

  // Commun
  { label: 'Inventaire',          icon: <Inventory2 />,        path: '/admin/inventaire',           adminOnly: false },
  { label: 'Fournisseurs',        icon: <LocalShipping />,     path: '/admin/fournisseurs',         adminOnly: false },
  { label: 'Commandes',           icon: <ShoppingCart />,      path: '/admin/commandes',            adminOnly: false },
  { label: 'Alertes',             icon: <NotificationsNone />, path: '/admin/alertes',              adminOnly: false },
  { label: 'Historique',          icon: <HistoryIcon />,       path: '/admin/historique',           adminOnly: false  },

  // Admin uniquement
  { label: 'Rapports',            icon: <Assessment />,        path: '/admin/rapports',             adminOnly: true  },
  { label: 'Inventaire physique', icon: <Inventory />,         path: '/admin/inventaire-physique',  adminOnly: true  },
  { label: 'Utilisateurs',        icon: <People />,            path: '/admin/utilisateurs',         adminOnly: true  },
  { label: 'Paramètres',          icon: <Settings />,          path: '/admin/parametres',           adminOnly: true  },
];

// ── Badge alertes dynamique ───────────────────────────────────────────────────
function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await alerteService.getNonLues();
        setCount((res.data as any).count ?? 0);
      } catch { /* silencieux */ }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Badge badgeContent={count} color="error" max={99}>
      <Notifications />
    </Badge>
  );
}

// ── Layout principal ──────────────────────────────────────────────────────────
export default function MainLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const { isAdmin, isPharmacien } = useRole();   // ✅ hook rôle

  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Filtrer les items selon le rôle
  const navItems = ALL_NAV_ITEMS.filter(item =>
    !item.adminOnly || isAdmin
  );

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { /* silencieux */ }
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

      {/* Navigation — filtrée selon le rôle */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/admin/tableau-de-bord'
              ? location.pathname === '/admin' || location.pathname === '/admin/tableau-de-bord'
              : location.pathname.startsWith(item.path);

          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2, mb: 0.5, py: 1,
                bgcolor:  isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'rgba(255,255,255,0.8)', minWidth: 36 }}>
                {item.label === 'Alertes' ? <NotificationBadge /> : item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize:   13.5,
                  fontWeight: isActive ? 700 : 400,
                  color:      'white',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Profil utilisateur */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: '#2196F3', fontSize: 14 }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="white" fontWeight={600} noWrap fontSize={12}>
            {user?.prenom} {user?.nom}
          </Typography>
          {/* ✅ Badge rôle dynamique */}
          <Chip
            label={isAdmin ? 'Admin' : 'Pharmacien'}
            size="small"
            sx={{
              bgcolor:    isAdmin ? 'rgba(255,235,59,0.25)' : 'rgba(76,175,80,0.25)',
              color:      isAdmin ? '#FFF176' : '#A5D6A7',
              fontSize:   10,
              height:     18,
              fontWeight: 700,
            }}
          />
        </Box>

        <Tooltip title="Se déconnecter">
          <IconButton onClick={handleLogout} size="small"
            sx={{ color: 'rgba(255,255,255,0.7)' }}>
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

        {/* Topbar */}
        <AppBar position="sticky" elevation={0} sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #E3F2FD',
          zIndex: 1,
        }}>
          <Toolbar sx={{ gap: 2 }}>
            <IconButton sx={{ display: { md: 'none' } }}
              onClick={() => setMobileOpen(true)}>
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
            <IconButton onClick={() => navigate('/admin/alertes')}>
              <NotificationBadge />
            </IconButton>

            {/* Profil topbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#2196F3', fontSize: 14 }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={600} color="#0D47A1" lineHeight={1.2}>
                  {user?.prenom} {user?.nom}
                </Typography>
                {/* ✅ Rôle dynamique dans la topbar aussi */}
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? 'Administrateur' : 'Pharmacien'}
                </Typography>
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