import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from './auth/useAuth'
import { requestError } from './api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setBusy(true)
    setError('')
    try { await logout() } catch (cause) { setError(requestError(cause)) }
    finally { setBusy(false) }
  }

  return <Stack spacing={4} sx={{ width: '100%' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>Welcome, {user.name}</Typography>
        <Typography color="text.secondary">{user.email}</Typography>
      </Box>
      <Button variant="outlined" onClick={handleLogout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</Button>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>Your workspace is ready</Typography>
      <Typography color="text.secondary">Account tracking and transactions are coming next. Your financial overview will appear here as those features become available.</Typography>
    </Paper>
  </Stack>
}
