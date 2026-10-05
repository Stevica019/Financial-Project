import { useEffect, useId, useState } from 'react'
import { Alert, Box, Button, Chip, Collapse, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack } from '@mui/material'
import FormField from './FormField'
import Icon from './Icon'

const clean = values => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))
const same = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => String(a[key]) === String(b[key]))

function chipLabel(field, value) {
  if (field.options) return field.options.find(option => String(option.value) === String(value))?.label ?? value
  return field.chip ? field.chip(value) : `${field.label}: ${value}`
}

// Search applies as you type (debounced); the other fields open from "Filters" and show as removable chips.
// `filters` are the applied values; `onChange` must be stable. `actions` fill the "More actions" menu: [{ label, run }].
export default function BrowseControls({ fields, filters, onChange, actions = [] }) {
  const [draft, setDraft] = useState(filters)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelId = useId()
  const [search, ...panelFields] = fields
  const active = panelFields.filter(field => clean(draft)[field.name] !== undefined)

  useEffect(() => {
    const next = clean(draft)
    if (same(next, filters)) return
    const timer = setTimeout(() => onChange(next), 300)
    return () => clearTimeout(timer)
  }, [draft, filters, onChange])

  // Removing a chip or clearing applies at once instead of waiting for the debounce.
  function apply(next) {
    setDraft(next)
    onChange(clean(next))
  }
  async function run(action) {
    setAnchor(null); setBusy(true); setError('')
    try { await action.run() } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }
  const set = (name, value) => setDraft(current => ({ ...current, [name]: value }))

  return <Stack spacing={1.5}>
    <Box className="browse-toolbar">
      <FormField field={{ ...search, type: 'search', required: false, size: 'small', className: 'browse-search', slotProps: { inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><Icon name="search" fontSize="small" /></InputAdornment> } } }}
        value={draft[search.name]} onChange={value => set(search.name, value)} />
      <Button variant={active.length ? 'contained' : 'outlined'} startIcon={<Icon name="filter" />} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="browse-filters-button">
        Filters{active.length > 0 && ` · ${active.length}`}
      </Button>
      {actions.length > 0 && <>
        <IconButton aria-label="More actions" aria-haspopup="true" aria-expanded={Boolean(anchor)} disabled={busy} onClick={event => setAnchor(event.currentTarget)}><Icon name="more" /></IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          {actions.map(action => <MenuItem key={action.label} onClick={() => run(action)}>{action.label}</MenuItem>)}
        </Menu>
      </>}
    </Box>
    <Collapse in={open} id={panelId} unmountOnExit>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box className="filter-grid">
          {panelFields.map(field => <FormField key={field.name} field={{ required: false, ...field, chip: undefined }} value={draft[field.name]} onChange={value => set(field.name, value)} />)}
        </Box>
      </Paper>
    </Collapse>
    {(active.length > 0 || clean(draft)[search.name] !== undefined) && <Box className="filter-chips" role="group" aria-label="Active filters">
      {active.map(field => {
        const label = chipLabel(field, draft[field.name])
        const remove = () => apply({ ...draft, [field.name]: '' })
        return <Chip key={field.name} label={label} aria-label={`Remove filter: ${label}`} onClick={remove} onDelete={remove} />
      })}
      <Button size="small" onClick={() => apply({})}>Clear all</Button>
    </Box>}
    {busy && <Alert severity="info">Preparing download…</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
  </Stack>
}
