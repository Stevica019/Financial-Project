import { useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'
import { api, requestError } from '../api'

// Downloads activity as CSV with the list's filters. Throws a user-facing message on failure.
export async function downloadCsv({ filters = {}, scope = 'history', accountId, template = false }) {
  try {
    const params = new URLSearchParams({ ...filters, scope, ...(accountId ? { history_account_id: accountId } : {}), ...(template ? { template: 1 } : {}) })
    params.delete('page'); params.delete('per_page')
    const response = await api.get(`/activity/export?${params}`, { responseType: 'blob', timeout: 60000 })
    if (!response.headers?.['content-type']?.includes('text/csv')) throw new Error('Unexpected download')
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = template ? 'finance-template.csv' : 'finance-activity.csv'
    document.body.append(anchor); anchor.click(); anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    throw new Error(cause.response?.status === 422 ? 'The export filters are invalid. Fix the filters and try again.' : requestError(cause), { cause })
  }
}

export default function CsvExport({ filters, scope, accountId, template = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function download() {
    setBusy(true); setError('')
    try { await downloadCsv({ filters, scope, accountId, template }) } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }
  return <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
    <Button variant="outlined" onClick={download} disabled={busy}>{busy ? 'Preparing CSV…' : template ? 'Download CSV template' : 'Export CSV'}</Button>
    {error && <Alert severity="error">{error}</Alert>}
  </Stack>
}
