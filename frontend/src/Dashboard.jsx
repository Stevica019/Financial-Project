import { useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router-dom'
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
    <Stack component="nav" aria-label="Workspace" direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {[['/', 'Overview'], ['/accounts', 'Accounts'], ['/categories', 'Categories'], ['/transactions', 'Transactions'], ['/transfers', 'Transfers'], ['/settings', 'Settings']].map(([to, label]) =>
        <Button key={to} component={NavLink} to={to} end sx={{ '&.active': { bgcolor: 'action.selected' } }}>{label}</Button>)}
    </Stack>
    <Outlet />
  </Stack>
}
