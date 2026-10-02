import { useState } from 'react'
import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ReportCharts from '../components/ReportCharts'
import { formatFlow, formatMoney, formatMonth } from '../format'

export default function Reports() {
  const [month, setMonth] = useState('')
  const remote = useRemote(`/reports${month ? `?month=${encodeURIComponent(month)}` : ''}`)
  const data = remote.data
  return <Stack spacing={3} sx={{ width: '100%' }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography component="h1" variant="h5">Monthly reports</Typography>
      <Button onClick={remote.reload} disabled={remote.loading}>Refresh</Button>
    </Stack>
    <TextField label="Report month" type="month" value={month || data?.month || ''} onChange={event => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 260 }} />
    <Typography color="text.secondary">Income and expenses across all your accounts. Transfers and opening balances are not included.</Typography>
    <RemoteState remote={remote}>{data && <>
      <Typography>{formatMonth(data.month)} compared with {formatMonth(data.previous_month)}.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {[['income', 'Income'], ['expenses', 'Expenses'], ['net_cash_flow', 'Net cash flow']].map(([key, label]) => <Paper key={key} component="section" aria-label={label} variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          <Stack spacing={1}>
            <Typography component="h3" variant="h6">{label}</Typography>
            <Typography>Selected: {formatMoney(data.monthly[key], data.currency)}</Typography>
            <Typography>Previous: {formatMoney(data.previous[key], data.currency)}</Typography>
            <Typography>Change: {formatFlow(data.change[key], data.currency, data.change[key].startsWith('-') ? 'out' : 'in')}</Typography>
          </Stack>
        </Paper>)}
      </Stack>
      <ReportCharts key={data.month} data={data} />
      <Stack component="section" aria-label="Spending by category" spacing={2}>
        <Typography component="h3" variant="h6">Spending by category</Typography>
        {data.spending_by_category.length === 0 && <Typography>No expenses recorded for this month.</Typography>}
        {data.spending_by_category.map(category => <Paper key={category.category_id} variant="outlined" sx={{ p: 2, overflowWrap: 'anywhere' }}>
          <Typography component="h4">{category.name}</Typography>
          <Typography>{formatMoney(category.amount, data.currency)}</Typography>
        </Paper>)}
      </Stack>
    </>}</RemoteState>
  </Stack>
}
