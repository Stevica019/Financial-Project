import { useEffect, useMemo, useState } from 'react'
import { Box, CssBaseline, TextField, ThemeProvider, createTheme, useMediaQuery } from '@mui/material'

export default function Appearance({ children }) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [preference, setPreference] = useState(() => {
    try { const saved = localStorage.getItem('finance-appearance'); return ['light', 'dark', 'system'].includes(saved) ? saved : 'system' }
    catch { return 'system' }
  })
  const mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  const theme = useMemo(() => createTheme({
    palette: { mode, primary: { main: mode === 'dark' ? '#90caf9' : '#1565c0' }, background: { default: mode === 'dark' ? '#101820' : '#f5f7fa', paper: mode === 'dark' ? '#19242f' : '#ffffff' } },
    shape: { borderRadius: 10 },
    components: { MuiButton: { styleOverrides: { root: { textTransform: 'none' } } } },
  }), [mode])
  useEffect(() => {
    try { localStorage.setItem('finance-appearance', preference) } catch { /* Appearance still works when storage is unavailable. */ }
  }, [preference])
  return <ThemeProvider theme={theme}>
    <CssBaseline enableColorScheme />
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 2 }}>
      <TextField select label="Appearance" value={preference} onChange={event => setPreference(event.target.value)} size="small" slotProps={{ select: { native: true } }}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </TextField>
    </Box>
    {children}
  </ThemeProvider>
}
