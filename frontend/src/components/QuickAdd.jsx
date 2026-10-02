import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, LinearProgress, Snackbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import { useWorkspace } from '../workspace'
import ActivityEditor from './ActivityEditor'
import Icon from './Icon'

// Opens the activity editor from anywhere in the workspace. Saving bumps the workspace revision so visible pages refetch.
export default function QuickAdd() {
  const { user } = useAuth()
  const { request, openActivity, closeActivity, notifyChange } = useWorkspace()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const [message, setMessage] = useState('')
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  const remotes = [accounts, categories, settings]
  const { refresh: refreshAccounts } = accounts
  const { refresh: refreshCategories } = categories
  const { refresh: refreshSettings } = settings
  // Accounts, categories and "today" may have changed on other pages since the data was loaded.
  useEffect(() => {
    if (request) { refreshAccounts(); refreshCategories(); refreshSettings() }
  }, [request, refreshAccounts, refreshCategories, refreshSettings])

  function saved(kind) {
    closeActivity()
    notifyChange()
    setMessage(kind === 'transfer' ? 'Transfer saved' : 'Transaction saved')
  }

  let dialog = null
  if (request) {
    const failed = remotes.find(remote => remote.error)
    const ready = remotes.every(remote => remote.data)
    const active = accounts.data?.data?.filter(account => account.is_active) ?? []
    if (!ready || failed) {
      dialog = <Dialog open onClose={closeActivity} fullWidth maxWidth="sm" aria-labelledby="quick-add-title">
        <DialogTitle id="quick-add-title">Add transaction</DialogTitle>
        <DialogContent>{failed ? <Alert severity="error" action={<Button color="inherit" onClick={() => remotes.forEach(remote => remote.reload())}>Try again</Button>}>{failed.error}</Alert> : <LinearProgress aria-label="Loading" />}</DialogContent>
        <DialogActions><Button onClick={closeActivity}>Cancel</Button></DialogActions>
      </Dialog>
    } else if (!request.record && active.length === 0) {
      dialog = <Dialog open onClose={closeActivity} fullWidth maxWidth="xs" aria-labelledby="quick-add-title">
        <DialogTitle id="quick-add-title">Add an account first</DialogTitle>
        <DialogContent><Typography>Transactions belong to an account, such as a bank account or cash. Add one to start recording.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={closeActivity}>Cancel</Button>
          <Button component={Link} to="/accounts" variant="contained" onClick={closeActivity}>Go to accounts</Button>
        </DialogActions>
      </Dialog>
    } else {
      dialog = <ActivityEditor record={request.record} kind={request.kind} accounts={accounts.data.data} categories={categories.data.data}
        today={settings.data.today} currency={user.currency} onClose={closeActivity} onSaved={saved} />
    }
  }

  return <>
    {compact && <Fab color="primary" aria-label="Add transaction" className="quick-add-fab" onClick={() => openActivity()}><Icon name="plus" /></Fab>}
    {dialog}
    <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} message={message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
  </>
}
