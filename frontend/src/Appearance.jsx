import { useEffect, useMemo, useState } from 'react'
import { Box, CssBaseline, ThemeProvider, Typography, createTheme, useMediaQuery } from '@mui/material'
import Icon from './components/Icon'
import { AppearanceContext } from './useAppearance'

export default function Appearance({ children, navigation }) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [preference, setPreference] = useState(() => {
    try { const saved = localStorage.getItem('finance-appearance'); return ['light', 'dark', 'system'].includes(saved) ? saved : 'system' }
    catch { return 'system' }
  })
  const mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#91b7ff' : '#2459ba', contrastText: mode === 'dark' ? '#101e35' : '#ffffff' },
      secondary: { main: mode === 'dark' ? '#efc76b' : '#8a6112', contrastText: '#101e35' },
      background: { default: mode === 'dark' ? '#0c1422' : '#f3f5f9', paper: mode === 'dark' ? '#152237' : '#ffffff' },
      text: { primary: mode === 'dark' ? '#f2f5fb' : '#15233b', secondary: mode === 'dark' ? '#adbbcf' : '#5b6980' },
      divider: mode === 'dark' ? '#2b3c54' : '#dce3ed',
      success: { main: mode === 'dark' ? '#7fd5b3' : '#217356' },
      warning: { main: mode === 'dark' ? '#efc76b' : '#8a6112' },
      error: { main: mode === 'dark' ? '#ffa4a4' : '#b63142' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
      h1: { fontWeight: 650, letterSpacing: '-0.055em' },
      h4: { fontWeight: 650, letterSpacing: '-0.045em', fontSize: '2rem' },
      h5: { fontWeight: 650, letterSpacing: '-0.035em' },
      h6: { fontWeight: 650, letterSpacing: '-0.025em', fontSize: '1.08rem' },
      button: { fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.16em', fontSize: '0.65rem' },
      body1: { fontSize: '0.94rem', lineHeight: 1.65 },
      body2: { fontSize: '0.82rem', lineHeight: 1.6 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', borderRadius: 10, padding: '9px 16px', transition: 'background-color 180ms, box-shadow 180ms, transform 180ms' }, contained: { '&:hover': { transform: 'translateY(-1px)' } } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', borderRadius: 16 }, outlined: { boxShadow: mode === 'dark' ? '0 6px 24px #0000000a' : '0 6px 24px #15233b04' } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: mode === 'dark' ? '#111d30' : '#fbfcfe' }, notchedOutline: { borderColor: mode === 'dark' ? '#40516a' : '#bac6d7' } } },
      MuiInputLabel: { styleOverrides: { root: { color: mode === 'dark' ? '#adbbcf' : '#5b6980' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 7 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 22 }, paperScrollPaper: { backgroundImage: 'none' } } },
      MuiDialogTitle: { styleOverrides: { root: { padding: '24px 24px 16px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px' } } },
      MuiMenuItem: { styleOverrides: { root: { margin: '3px 8px', borderRadius: 8, minHeight: 44, fontSize: '0.9rem' } } },
      MuiListSubheader: { styleOverrides: { root: { backgroundColor: 'transparent', fontSize: '0.7rem', lineHeight: '32px', textTransform: 'uppercase', letterSpacing: '0.1em' } } },
      MuiLinearProgress: { styleOverrides: { root: { height: 7, borderRadius: 8 }, bar: { borderRadius: 8 } } },
      MuiTableCell: { styleOverrides: { head: { fontWeight: 700, backgroundColor: mode === 'dark' ? '#111d30' : '#f3f5f9' } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  }), [mode])
  useEffect(() => {
    try { localStorage.setItem('finance-appearance', preference) } catch { /* Appearance still works when storage is unavailable. */ }
  }, [preference])
  return <AppearanceContext.Provider value={{ preference, setPreference }}><ThemeProvider theme={theme}>
    <CssBaseline enableColorScheme />
    <Box className={`app-shell theme-${mode}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Box component="header" className="site-header">
      <Box className="header-inner">
      <a className="brand" href="/" aria-label="Personal Finance home"><span className="brand-mark"><Icon name="chart" /></span><span>Personal<span className="brand-light">Finance</span><span className="brand-dot">.</span></span></a>
      {navigation}
      </Box>
    </Box>
    {children}
    <Box component="footer" className="site-footer">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>A little clarity. A lot of possibility<span className="gold-text">.</span></Typography>
      <Typography variant="caption" color="text.secondary">Personal Finance · Make room for what matters.</Typography>
    </Box>
    </Box>
  </ThemeProvider></AppearanceContext.Provider>
}
