import { Alert, Box, Button, CircularProgress, Container, CssBaseline, Stack, Typography } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import AuthPage from './auth/AuthPage'
import Dashboard from './Dashboard'
import Settings from './pages/Settings'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'

export default function App() {
  const { status, user, retry } = useAuth()
  let content
  if (status === 'checking') {
    content = <Stack role="status" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress aria-label="Checking your session" /><Typography>Loading your workspace…</Typography></Stack>
  } else if (status === 'error') {
    content = <Alert severity="error" action={<Button color="inherit" onClick={retry}>Try again</Button>}>Unable to check your session. Please try again.</Alert>
  } else {
    const signedIn = status === 'authenticated'
    const configured = Boolean(user?.currency && user?.timezone)
    content = <Routes>
      <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="login" />} />
      <Route path="/register" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="register" register />} />
      <Route element={signedIn ? <Dashboard /> : <Navigate to="/login" replace />}>
        <Route path="/" element={configured ? <Overview /> : <Navigate to="/settings" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/accounts" element={configured ? <Accounts /> : <Navigate to="/settings" replace />} />
        <Route path="/accounts/:accountId/history" element={configured ? <Transactions /> : <Navigate to="/settings" replace />} />
        <Route path="/transactions" element={configured ? <Transactions /> : <Navigate to="/settings" replace />} />
        <Route path="/categories" element={configured ? <Categories /> : <Navigate to="/settings" replace />} />
      </Route>
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
