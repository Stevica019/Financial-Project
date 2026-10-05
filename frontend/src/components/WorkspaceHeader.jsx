import { useState } from 'react'
import { Alert, Avatar, Box, Button, Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem, Snackbar, useMediaQuery, useTheme } from '@mui/material'
import { NavLink } from 'react-router-dom'
import Icon from './Icon'
import { useAuth } from '../auth/useAuth'
import { requestError } from '../api'
import { useWorkspace } from '../workspace'

// Header actions for signed-in users: quick add on wide screens (narrow screens get the floating button) and the user menu.
export default function WorkspaceHeader() {
  const [anchor, setAnchor] = useState(null)
  const { logout, user } = useAuth()
  const { openActivity } = useWorkspace()
  const configured = Boolean(user?.currency && user?.timezone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const close = () => setAnchor(null)
  async function handleLogout() {
    if (busy) return
    close()
    setBusy(true)
    setError('')
    try { await logout() } catch (cause) { setError(requestError(cause)) }
    finally { setBusy(false) }
  }
  return <Box className="header-actions">
    {!compact && configured && <Button variant="contained" className="nav-add" startIcon={<Icon name="plus" />} onClick={() => openActivity()}>Add transaction</Button>}
    <IconButton id="user-menu-button" aria-label="User menu" aria-controls={anchor ? 'user-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)} className="user-menu-button">
      <Avatar className="user-avatar">{user?.name?.trim()[0]?.toUpperCase() ?? '?'}</Avatar>
    </IconButton>
    <Menu id="user-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ list: { 'aria-labelledby': 'user-menu-button' }, paper: { sx: { minWidth: 230, mt: 1 } } }}>
      <ListSubheader className="user-menu-identity"><strong>{user?.name}</strong><span>{user?.email}</span></ListSubheader>
      <Divider />
      <MenuItem component={NavLink} to="/settings" onClick={close}><ListItemIcon><Icon name="settings" fontSize="small" /></ListItemIcon>Settings</MenuItem>
      <MenuItem disabled={busy} onClick={handleLogout}><ListItemIcon><Icon name="logout" fontSize="small" /></ListItemIcon>{busy ? 'Signing out…' : 'Sign out'}</MenuItem>
    </Menu>
    <Snackbar open={Boolean(error)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
    </Snackbar>
  </Box>
}
