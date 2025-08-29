import React from 'react';
import { createTheme, ThemeProvider, ThemeOptions } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Define the console terminal theme to match our app
const consoleTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // Console blue
      light: '#4791db',
      dark: '#115293',
      contrastText: '#fff',
    },
    secondary: {
      main: '#E5FF03', // Yellow highlight
      light: '#EAFF4C',
      dark: '#B0C400',
      contrastText: '#000',
    },
    background: {
      default: '#070a11', // Dark console black
      paper: 'rgba(10, 25, 41, 0.9)', // Semi-transparent dark blue
    },
    text: {
      primary: '#FFFFFF', // White text
      secondary: '#CCCCCC', // Light gray text
    },
    error: {
      main: '#ff6b6b', // Bright red for errors
    },
    warning: {
      main: '#ffa502', // Orange for warnings
    },
    info: {
      main: '#70a1ff', // Light blue for info
    },
    success: {
      main: '#2ed573', // Green for success
    },
  },
  typography: {
    fontFamily: '"VT323", "Orbitron", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Orbitron", sans-serif' },
    h2: { fontFamily: '"Orbitron", sans-serif' },
    h3: { fontFamily: '"Orbitron", sans-serif' },
    h4: { fontFamily: '"Orbitron", sans-serif' },
    h5: { fontFamily: '"Orbitron", sans-serif' },
    h6: { fontFamily: '"Orbitron", sans-serif' },
    button: { fontFamily: '"VT323", monospace' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 4,
          border: '1px solid rgba(25, 118, 210, 0.3)',
          boxShadow: '0 0 10px rgba(25, 118, 210, 0.2)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(25, 118, 210, 0.15)',
            fontWeight: 'bold',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(25, 118, 210, 0.2)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#E5FF03',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#E5FF03',
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#1976d2',
        },
      },
    },
  },
});

interface ThemeProps {
  children: React.ReactNode;
}

// Theme provider component
export const ConsoleThemeProvider: React.FC<ThemeProps> = ({ children }) => {
  return (
    <ThemeProvider theme={consoleTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default consoleTheme; 