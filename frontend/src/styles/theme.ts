import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1565C0',
    },
    secondary: {
      main: '#E3F2FD',
    },
    background: {
      default: '#F0F8FF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;