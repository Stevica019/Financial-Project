import { useState } from 'react'
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { api, requestError } from '../api'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import CsvExport from '../components/CsvExport'

export default function CsvImport() {
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [result, setResult] = useState(null)
  async function submit(confirm = false) {
    setBusy(true); setErrors([]); setResult(null)
    try {
      if (confirm) {
        const { data } = await api.post('/activity/import', { token: preview.token }, { timeout: 60000 })
        setResult(data); setPreview(null)
      } else {
        setPreview(null)
        const body = new FormData(); body.append('file', file)
        const { data } = await api.post('/activity/import/preview', body, { timeout: 60000 })
        setPreview(data)
      }
    } catch (cause) {
      const validation = cause.response?.data?.errors
      setErrors(validation ? Object.entries(validation).map(([field, messages]) => `${field}: ${messages.join(' ')}`) : [requestError(cause)])
    } finally { setBusy(false) }
  }
  return <Stack spacing={3} sx={{ width: '100%', minWidth: 0 }}>
    <Typography component="h1" variant="h5">CSV import</Typography>
    <Typography>Import income, expenses and transfers in {user.currency}. Download the template or use an app CSV export. Keep the column headers and order. Use YYYY-MM-DD dates and positive amounts with a decimal point.</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><CsvExport template /><CsvExport /></Stack>
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography>Fill account_id and category_id for income/expense rows, or source_account_id and destination_account_id for transfer rows. Set type to income, expense or transfer and currency to {user.currency}. Name columns are informational; IDs choose the accounts and categories. Description is required for income/expenses. Transfers must leave notes blank.</Typography>
      <RemoteState remote={accounts}><RemoteState remote={categories}>
        <details><summary>Account and category IDs</summary>
          <Typography component="h3" variant="subtitle1" sx={{ mt: 2 }}>Active accounts</Typography>
          {accounts.data?.data.filter(account => account.is_active).map(account => <Typography key={account.id} sx={{ overflowWrap: 'anywhere' }}>{account.id}: {account.name} (opened {account.opening_date})</Typography>)}
          <Typography component="h3" variant="subtitle1" sx={{ mt: 2 }}>Categories</Typography>
          {categories.data?.data.map(category => <Typography key={category.id} sx={{ overflowWrap: 'anywhere' }}>{category.id}: {category.name} ({category.type})</Typography>)}
        </details>
      </RemoteState></RemoteState>
    </Paper>
    <Typography>Choose a UTF-8, comma-separated CSV, up to 2 MB and 1000 records. Every row must pass validation. Exact duplicates, including identical rows within the file, are skipped. Repeated identical payments should be recorded manually. Import adds activity; it does not update existing records or create accounts/categories.</Typography>
    <Stack spacing={1}>
      <label htmlFor="csv-file">CSV file</label>
      <input id="csv-file" type="file" accept=".csv,text/csv" disabled={busy} onChange={event => { setFile(event.target.files[0] ?? null); setPreview(null); setErrors([]); setResult(null) }} style={{ maxWidth: '100%' }} />
    </Stack>
    <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={!file || busy} onClick={() => submit()}>{busy ? 'Processing…' : 'Preview import'}</Button>
    {errors.length > 0 && <Alert severity="error"><Stack>{errors.map((error, index) => <Typography key={index} sx={{ overflowWrap: 'anywhere' }}>{error}</Typography>)}</Stack></Alert>}
    {result && <Alert severity="success">{result.already_imported ? 'This file was already imported. ' : ''}Imported {result.imported} records; skipped {result.skipped}. Balances and reports reflect the imported activity.</Alert>}
    {preview && <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Typography role="status">{preview.total} records; {preview.duplicates} exact duplicates found. Showing the first {preview.rows.length}. Preview expires in 30 minutes.</Typography>
      {preview.already_imported && <Alert severity="info">This file was already imported. Confirming again will not add records, even if earlier imported entries were deleted.</Alert>}
      <TableContainer component={Paper} variant="outlined" tabIndex={0} role="region" aria-label="Import preview" sx={{ maxWidth: '100%' }}>
        <Table size="small"><TableHead><TableRow>{['Type', 'Date', 'Amount', 'Account IDs', 'Category ID', 'Description'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>{preview.rows.map((row, index) => <TableRow key={index}>
            <TableCell>{row.type}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{row.date}</TableCell><TableCell>{row.currency} {row.amount}</TableCell>
            <TableCell>{row.type === 'transfer' ? `${row.source_account_id} → ${row.destination_account_id}` : row.account_id}</TableCell><TableCell>{row.category_id}</TableCell><TableCell sx={{ overflowWrap: 'anywhere', minWidth: 120 }}>{row.description}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>
      <Typography>Confirm to save all valid new records together. Accounts, dates and duplicates are checked again before saving.</Typography>
      <Button variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => submit(true)}>Confirm import</Button>
    </Stack>}
  </Stack>
}
