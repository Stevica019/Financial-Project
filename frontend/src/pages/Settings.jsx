import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { api, requestError } from '../api'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import FormField from '../components/FormField'
import RemoteState from '../components/RemoteState'
import AppearanceControl from '../components/AppearanceControl'

function SettingsForm({ metadata }) {
  const { user, updateUser } = useAuth()
  const suggested = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [values, setValues] = useState({
    currency: metadata.user.currency ?? '',
    timezone: metadata.user.timezone ?? (metadata.timezones.includes(suggested) ? suggested : 'UTC'),
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const fields = [
    { name: 'currency', label: 'Currency', options: [{ value: '', label: 'Choose a currency' }, ...metadata.currencies.map(code => ({ value: code, label: code }))], hint: 'All your accounts and goals use this currency. It locks after your first account is created and cannot change while savings goals exist.' },
    { name: 'timezone', label: 'Timezone', options: metadata.timezones.map(zone => ({ value: zone, label: zone })), hint: 'Used for dates and monthly summaries. Check the suggested timezone before saving.' },
  ]
  async function save(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setErrors({}); setError(''); setSaved(false)
    try {
      const { data } = await api.put('/settings', values)
      updateUser(data)
      setSaved(true)
    } catch (cause) {
      setErrors(cause.response?.data?.errors ?? {})
      setError(requestError(cause))
    } finally { setBusy(false) }
  }
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
    <Box component="form" onSubmit={save}>
      <Stack spacing={3}>
        {!user.currency && <Alert severity="info">Choose your preferences before creating accounts. No currency has been selected for you.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Preferences saved. <Link to="/accounts">Go to accounts</Link></Alert>}
        {user.currency_locked && <Alert severity="info">Your currency is locked because an account has been created. Deleting or archiving accounts does not unlock it.</Alert>}
        {fields.map(field => <FormField key={field.name} field={field} value={values[field.name]} error={errors[field.name]?.[0]} disabled={busy || (field.name === 'currency' && user.currency_locked)} onChange={value => { setValues(current => ({ ...current, [field.name]: value })); setSaved(false) }} />)}
        <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'start' }}>{busy ? 'Saving...' : 'Save preferences'}</Button>
      </Stack>
    </Box>
  </Paper>
}

export default function Settings() {
  const remote = useRemote('/settings')
  const { user } = useAuth()
  return <Stack spacing={3}>
    <Box><Typography component="h1" variant="h5">Settings</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>Your profile, workspace appearance, and financial preferences.</Typography></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      <Paper component="section" aria-labelledby="profile-title" variant="outlined" sx={{ p: 3, minWidth: 0 }}>
        <Typography id="profile-title" component="h2" variant="h6">Profile</Typography>
        <Box component="dl" sx={{ m: 0, mt: 2, overflowWrap: 'anywhere' }}>
          <Typography component="dt" variant="body2" color="text.secondary">Name</Typography>
          <Typography component="dd" sx={{ m: 0, mb: 2, fontWeight: 600 }}>{user.name}</Typography>
          <Typography component="dt" variant="body2" color="text.secondary">Email</Typography>
          <Typography component="dd" sx={{ m: 0 }}>{user.email}</Typography>
        </Box>
      </Paper>
      <Paper component="section" aria-labelledby="display-title" variant="outlined" sx={{ p: 3, minWidth: 0 }}>
        <Stack spacing={3}>
          <Typography id="display-title" component="h2" variant="h6">Display</Typography>
          <AppearanceControl />
        </Stack>
      </Paper>
    </Box>
    <Stack component="section" aria-labelledby="preferences-title" spacing={2}>
      <Typography id="preferences-title" component="h2" variant="h6">Financial preferences</Typography>
      <RemoteState remote={remote}>{remote.data && <SettingsForm metadata={remote.data} />}</RemoteState>
    </Stack>
  </Stack>
}
