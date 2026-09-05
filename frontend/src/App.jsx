import { Alert, Box, Button, CircularProgress, Container, CssBaseline, Stack, Typography } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import AuthPage from './auth/AuthPage'
import Dashboard from './Dashboard'

export default function App() {
  const { status, retry } = useAuth()
  let content
  if (status === 'checking') {
    content = <Stack role="status" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress aria-label="Checking your session" /><Typography>Loading your workspace…</Typography></Stack>
  } else if (status === 'error') {
    content = <Alert severity="error" action={<Button color="inherit" onClick={retry}>Try again</Button>}>Unable to check your session. Please try again.</Alert>
  } else {
    const signedIn = status === 'authenticated'
    content = <Routes>
      <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="login" />} />
      <Route path="/register" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="register" register />} />
      <Route path="/" element={signedIn ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  }
  return <>
    <CssBaseline />
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 7 } }}>
      <Typography variant="overline" color="text.secondary">Personal Finance</Typography>
      <Box component="main" sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 7 } }}>{content}</Box>
    </Container>
  </>
}
