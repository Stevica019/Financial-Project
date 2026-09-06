import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material'
import { api, requestError } from '../api'
import { useRemote } from '../useRemote'
import FormField from './FormField'
import RemoteState from './RemoteState'

function Editor({ noun, fields, initialValues, onClose, onSave, editing }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setErrors({})
    try { await onSave(values) } catch (cause) {
      setErrors(cause.response?.data?.errors ?? {})
      setError(requestError(cause))
    } finally { setBusy(false) }
  }
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="editor-title">
    <form onSubmit={submit}>
      <DialogTitle id="editor-title">{editing ? 'Edit' : 'Create'} {noun}</DialogTitle>
      <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {fields.map(field => <FormField key={field.name} field={field} value={values[field.name]} error={errors[field.name]?.[0]} disabled={busy} onChange={value => setValues(current => ({ ...current, [field.name]: value }))} />)}
      </Stack></DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving...' : `Save ${noun}`}</Button>
      </DialogActions>
    </form>
  </Dialog>
}

export default function ResourceManager({ title, noun, endpoint, fields, defaults, details, archivable = false, onSaved, introduction }) {
  const remote = useRemote(endpoint)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(values) {
    if (editor.id) await api.put(`${endpoint}/${editor.id}`, values)
    else await api.post(endpoint, values)
    onSaved?.()
    setEditor(null)
    remote.reload()
  }
  async function archive(record) {
    setBusy(true); setError('')
    try {
      await api.patch(`${endpoint}/${record.id}`, { is_active: !record.is_active })
      remote.reload()
    } catch (cause) { setError(requestError(cause)) }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try {
      await api.delete(`${endpoint}/${deleting.id}`)
      setDeleting(null)
      remote.reload()
    } catch (cause) { setError(requestError(cause)) }
    finally { setBusy(false) }
  }
  return <Stack spacing={3}>
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography component="h2" variant="h5">{title}</Typography>
      <Button variant="contained" disabled={busy || remote.loading || Boolean(remote.error)} onClick={() => { setError(''); setEditor({}) }}>Add {noun}</Button>
    </Stack>
    <Typography color="text.secondary">{introduction}</Typography>
    {error && !deleting && <Alert severity="error">{error}</Alert>}
    <RemoteState remote={remote}>
      {remote.data?.data.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography>No {title.toLowerCase()} yet. Add your first {noun} to get started.</Typography></Paper>}
      <Stack spacing={2}>
        {remote.data?.data.map(record => <Paper key={record.id} component="article" aria-label={record.name} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Typography component="h3" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{record.name}</Typography>
            {details(record)}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button disabled={busy} onClick={() => { setError(''); setEditor(record) }}>Edit</Button>
              {archivable && <Button disabled={busy} onClick={() => archive(record)}>{record.is_active ? 'Archive' : 'Unarchive'}</Button>}
              <Button color="error" disabled={busy} onClick={() => { setError(''); setDeleting(record) }}>Delete</Button>
            </Stack>
          </Stack>
        </Paper>)}
      </Stack>
    </RemoteState>
    {editor && <Editor noun={noun} fields={fields} initialValues={{ ...defaults, ...editor }} editing={Boolean(editor.id)} onClose={() => setEditor(null)} onSave={save} />}
    <Dialog open={Boolean(deleting)} onClose={busy ? undefined : () => { setDeleting(null); setError('') }} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">Delete {noun}?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>Delete "{deleting?.name}"? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => { setDeleting(null); setError('') }}>Cancel</Button>
        <Button disabled={busy} color="error" onClick={remove}>{busy ? 'Deleting...' : `Delete ${noun}`}</Button>
      </DialogActions>
    </Dialog>
  </Stack>
}
