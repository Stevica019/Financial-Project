import { useState } from 'react'
import { Alert, Box, Button, Divider, Menu, MenuItem, ListSubheader, Snackbar, useMediaQuery, useTheme } from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useAuth } from '../auth/useAuth'
import { requestError } from '../api'

const main = [['/', 'Overview'], ['/transactions', 'Transactions'], ['/accounts', 'Accounts'], ['/reports', 'Reports']]
const groups = [
  ['Plan ahead', [['/budgets', 'Budgets'], ['/goals', 'Savings goals'], ['/recurring', 'Recurring']]],
  ['Manage', [['/transfers', 'Transfers'], ['/categories', 'Categories'], ['/import', 'CSV import'], ['/settings', 'Settings']]],
]

export default function WorkspaceNavigation() {
  const [anchor, setAnchor] = useState(null)
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const { pathname } = useLocation()
  const extraActive = groups.some(([, links]) => links.some(([to]) => pathname === to))
  const close = () => setAnchor(null)
  async function handleLogout() {
    if (busy) return
    close()
    setBusy(true)
    setError('')
    try { await logout() } catch (cause) { setError(requestError(cause)) }
    finally { setBusy(false) }
  }
  return <Box component="nav" aria-label="Workspace" className="workspace-nav">
    {!compact && main.map(([to, label]) => <Button component={NavLink} key={to} to={to} end={to === '/'} className="nav-link">{label}</Button>)}
    <Button id="workspace-menu-button" aria-controls={anchor ? 'workspace-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)}
      className={`nav-link ${extraActive ? 'active' : ''}`} startIcon={compact ? <Icon name="menu" /> : undefined} endIcon={compact ? undefined : <Icon name="chevron" />}>
      {compact ? 'Menu' : 'More'}
    </Button>
    <Menu id="workspace-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={close} slotProps={{ list: { 'aria-labelledby': 'workspace-menu-button' }, paper: { sx: { minWidth: 230, mt: 1 } } }}>
      {compact && <ListSubheader>Workspace</ListSubheader>}
      {compact && main.map(([to, label]) => <MenuItem component={NavLink} key={to} to={to} end={to === '/'} onClick={close} selected={pathname === to}>{label}</MenuItem>)}
      {groups.flatMap(([label, links]) => [<Divider key={`${label}-divider`} />, <ListSubheader key={label}>{label}</ListSubheader>, ...links.map(([to, name]) => <MenuItem component={NavLink} key={to} to={to} onClick={close} selected={pathname === to}>{name}</MenuItem>)])}
      <Divider />
      <MenuItem disabled={busy} onClick={handleLogout}>{busy ? 'Signing out…' : 'Sign out'}</MenuItem>
    </Menu>
    <Snackbar open={Boolean(error)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
    </Snackbar>
  </Box>
}
