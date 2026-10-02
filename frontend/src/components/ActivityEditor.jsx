import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { api, requestError } from '../api'
import { currencySymbol } from '../format'
import FormField from './FormField'

const LAST_ACCOUNT = 'finance-last-account'
const kinds = [['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']]

function rememberedAccount() {
  try { return localStorage.getItem(LAST_ACCOUNT) ?? '' } catch { return '' }
}

function rememberAccount(id) {
  try { localStorage.setItem(LAST_ACCOUNT, String(id)) } catch { /* Remembering the account is only a convenience. */ }
}

function initialValues(record, { kind, accountId, accounts, today }) {
  if (record?.id && record.kind === 'transfer') {
    return { kind: 'transfer', amount: record.amount, date: record.date, description: record.description ?? '', source_account_id: record.source_account_id, destination_account_id: record.destination_account_id, account_id: '', category_id: '', notes: '' }
  }
  if (record?.id) {
    return { kind: record.type, amount: record.amount, date: record.date, description: record.description ?? '', notes: record.notes ?? '', account_id: record.account_id, category_id: record.category_id, source_account_id: '', destination_account_id: '' }
  }
  const active = accounts.filter(account => account.is_active)
  const preferred = [accountId, rememberedAccount()].find(id => id && active.some(account => String(account.id) === String(id)))
  const account = preferred ?? (active.length === 1 ? active[0].id : '')
  return { kind: kind ?? 'expense', amount: '', date: today, description: '', notes: '', account_id: account, category_id: '', source_account_id: account, destination_account_id: '' }
}

// Records income, expenses and transfers in one dialog. Existing records keep their kind; income and expenses can switch.
export default function ActivityEditor({ record, kind, accountId, accounts, categories, today, currency, onClose, onSaved, onDelete }) {
  const editing = Boolean(record?.id)
  const [values, setValues] = useState(() => initialValues(record, { kind, accountId, accounts, today }))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const amountRef = useRef(null)
  const transfer = values.kind === 'transfer'
  const noun = transfer ? 'transfer' : 'transaction'
  const accountOptions = current => [{ value: '', label: 'Choose an account' }, ...accounts
    .filter(account => account.is_active || (editing && String(account.id) === String(current)))
    .map(account => ({ value: account.id, label: `${account.name}${account.is_active ? '' : ' (archived)'}` }))]
  const set = (name, value) => setValues(current => ({ ...current, [name]: value }))

  function changeKind(next) {
    if (!next) return
    setErrors({})
    setValues(current => ({
      ...current, kind: next,
      category_id: next === current.kind ? current.category_id : '',
      ...(next === 'transfer' && current.kind !== 'transfer' ? { source_account_id: current.account_id || current.source_account_id } : {}),
      ...(next !== 'transfer' && current.kind === 'transfer' ? { account_id: current.source_account_id || current.account_id } : {}),
    }))
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setErrors({})
    const { amount, date, description } = values
    const [endpoint, payload] = transfer
      ? ['/transfers', { source_account_id: values.source_account_id, destination_account_id: values.destination_account_id, amount, date, description }]
      : ['/transactions', { type: values.kind, account_id: values.account_id, category_id: values.category_id, amount, date, description, notes: values.notes }]
    try {
      if (editing) await api.put(`${endpoint}/${record.id}`, payload)
      else await api.post(endpoint, payload)
      if (!editing) rememberAccount(transfer ? values.source_account_id : values.account_id)
      onSaved(values.kind)
    } catch (cause) {
      setErrors(cause.response?.data?.errors ?? {})
      setError(requestError(cause))
    } finally { setBusy(false) }
  }

  const field = (name, props) => <FormField field={{ name, ...props }} value={values[name]} error={errors[name]?.[0]} disabled={busy} onChange={value => set(name, value)} />
  // New entries focus the amount once the dialog has opened; the dialog focuses its own paper first.
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="activity-editor-title" slotProps={{ transition: { onEntered: () => { if (!editing) amountRef.current?.focus() } } }}>
    <form onSubmit={submit}>
      <DialogTitle id="activity-editor-title">{editing ? 'Edit' : 'Add'} {noun}</DialogTitle>
      <DialogContent><Stack spacing={2.5} sx={{ pt: 1 }}>
        <ToggleButtonGroup exclusive fullWidth color="primary" size="small" value={values.kind} onChange={(_event, next) => changeKind(next)} aria-label="Type" disabled={busy}>
          {kinds.map(([value, label]) => <ToggleButton key={value} value={value} sx={{ textTransform: 'none', fontWeight: 600 }} disabled={editing && (value === 'transfer') !== (record.kind === 'transfer')}>{label}</ToggleButton>)}
        </ToggleButtonGroup>
        {error && <Alert severity="error">{error}</Alert>}
        <Box className="form-grid">
          {field('amount', { label: 'Amount', inputRef: amountRef, placeholder: '0.00', slotProps: { htmlInput: { inputMode: 'decimal' }, input: { startAdornment: <InputAdornment position="start">{currencySymbol(currency)}</InputAdornment> } } })}
          {field('date', { label: 'Date', type: 'date' })}
          {transfer ? <>
            {field('source_account_id', { label: 'From account', options: accountOptions(record?.source_account_id) })}
            {field('destination_account_id', { label: 'To account', options: accountOptions(record?.destination_account_id) })}
          </> : <>
            {field('category_id', { label: 'Category', options: [{ value: '', label: 'Choose a category' }, ...categories.filter(category => category.type === values.kind).map(category => ({ value: category.id, label: category.name }))] })}
            {field('account_id', { label: 'Account', options: accountOptions(record?.account_id) })}
          </>}
          <Box className="form-grid-wide">{field('description', { label: 'Description', required: !transfer, slotProps: { htmlInput: { maxLength: 255 } } })}</Box>
          {!transfer && <Box className="form-grid-wide">{field('notes', { label: 'Notes', required: false, multiline: true, minRows: 2 })}</Box>}
        </Box>
      </Stack></DialogContent>
      <DialogActions>
        {editing && onDelete && <Button color="error" disabled={busy} onClick={onDelete} sx={{ mr: 'auto' }}>Delete</Button>}
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : `Save ${noun}`}</Button>
      </DialogActions>
    </form>
  </Dialog>
}
