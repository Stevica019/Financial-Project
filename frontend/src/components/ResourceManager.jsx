import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material'
import { api, requestError } from '../api'
import { useRemote } from '../useRemote'
import FormField from './FormField'
import RemoteState from './RemoteState'
import BrowseControls from './BrowseControls'
import CsvExport from './CsvExport'

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
        {(typeof fields === 'function' ? fields(values, initialValues) : fields).map(({ resetFields = [], ...field }) => <FormField key={field.name} field={field} value={values[field.name]} error={errors[field.name]?.[0]} disabled={busy} onChange={value => setValues(current => ({ ...current, ...Object.fromEntries(resetFields.map(name => [name, ''])), [field.name]: value }))} />)}
      </Stack></DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving...' : `Save ${noun}`}</Button>
      </DialogActions>
    </form>
  </Dialog>
}

export default function ResourceManager({ title, noun, endpoint, writeEndpoint = endpoint, fields, defaults, details, archivable = false, archiveLabels = ['Archive', 'Unarchive'], onSaved, introduction, browseFields, recordConfig }) {
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)
  const query = new URLSearchParams({ ...filters, page })
  const remote = useRemote(browseFields ? `${endpoint}?${query}` : endpoint)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const config = record => ({ noun, endpoint: writeEndpoint, fields, defaults, ...recordConfig?.(record) })
  const editorConfig = config(editor)
  const deleteConfig = config(deleting)
  const recordName = record => record?.name || record?.description || 'Transfer'
  function applyFilters(values) {
    setFilters(Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')))
    setPage(1)
  }
  async function save(values) {
    if (editor.id) await api.put(`${editorConfig.endpoint}/${editor.id}`, values)
    else await api.post(editorConfig.endpoint, values)
    onSaved?.()
    setEditor(null)
    remote.reload()
  }
  async function archive(record) {
    setBusy(true); setError('')
    try {
      await api.patch(`${endpoint}/${record.id}`, { is_active: !record.is_active })
      remote.reload()
    } catch (cause) {
      const messages = cause.response?.status === 422 ? Object.values(cause.response.data.errors ?? {}).flat().join(' ') : ''
      setError(messages || requestError(cause))
    }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try {
      await api.delete(`${deleteConfig.endpoint}/${deleting.id}`)
      onSaved?.()
      setDeleting(null)
      if (page > 1 && remote.data?.data.length === 1) setPage(current => current - 1)
      remote.reload()
    } catch (cause) {
      const messages = cause.response?.status === 422 ? Object.values(cause.response.data.errors ?? {}).flat().join(' ') : ''
      setError(messages || requestError(cause))
    }
    finally { setBusy(false) }
  }
  return <Stack spacing={3}>
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography component="h2" variant="h5">{title}</Typography>
      <Button variant="contained" disabled={busy || remote.loading || Boolean(remote.error)} onClick={() => { setError(''); setEditor({}) }}>Add {noun}</Button>
    </Stack>
    <Typography color="text.secondary">{introduction}</Typography>
    {browseFields && <BrowseControls fields={browseFields} onApply={applyFilters} />}
    {browseFields && <CsvExport filters={filters} scope={endpoint === '/transactions' ? 'transactions' : endpoint === '/transfers' ? 'transfers' : 'history'} accountId={endpoint.startsWith('/accounts/') ? endpoint.split('/')[2] : undefined} />}
    {error && !deleting && <Alert severity="error">{error}</Alert>}
    <RemoteState remote={remote}>
      {remote.data?.data.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography>{browseFields ? 'No activity matches these filters.' : `No ${title.toLowerCase()} yet. Add your first ${noun} to get started.`}</Typography></Paper>}
      <Stack spacing={2}>
        {remote.data?.data.map(record => <Paper key={`${record.kind ?? noun}-${record.id}`} component="article" aria-label={recordName(record)} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Typography component="h3" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{recordName(record)}</Typography>
            {details(record)}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button disabled={busy} onClick={() => { setError(''); setEditor(record) }}>Edit</Button>
              {archivable && <Button disabled={busy} onClick={() => archive(record)}>{record.is_active ? archiveLabels[0] : archiveLabels[1]}</Button>}
              <Button color="error" disabled={busy} onClick={() => { setError(''); setDeleting(record) }}>Delete</Button>
            </Stack>
          </Stack>
        </Paper>)}
      </Stack>
      {browseFields && remote.data?.meta && <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography role="status">{remote.data.meta.total} results · Page {remote.data.meta.current_page} of {remote.data.meta.last_page}</Typography>
        <Button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous page</Button>
        <Button disabled={page >= remote.data.meta.last_page} onClick={() => setPage(current => current + 1)}>Next page</Button>
      </Stack>}
    </RemoteState>
    {editor && <Editor noun={editorConfig.noun} fields={editorConfig.fields} initialValues={{ ...editorConfig.defaults, ...editor }} editing={Boolean(editor.id)} onClose={() => setEditor(null)} onSave={save} />}
    <Dialog open={Boolean(deleting)} onClose={busy ? undefined : () => { setDeleting(null); setError('') }} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">Delete {deleteConfig.noun}?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>Delete "{recordName(deleting)}"? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => { setDeleting(null); setError('') }}>Cancel</Button>
        <Button disabled={busy} color="error" onClick={remove}>{busy ? 'Deleting...' : `Delete ${deleteConfig.noun}`}</Button>
      </DialogActions>
    </Dialog>
  </Stack>
}
