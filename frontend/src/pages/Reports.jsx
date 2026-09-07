import { useState } from 'react'
import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'

export default function Reports() {
  const [month, setMonth] = useState('')
  const remote = useRemote(`/reports${month ? `?month=${encodeURIComponent(month)}` : ''}`)
  const data = remote.data
  return <Stack spacing={3} sx={{ width: '100%' }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography component="h2" variant="h5">Monthly reports</Typography>
      <Button onClick={remote.reload} disabled={remote.loading}>Refresh</Button>
    </Stack>
    <TextField label="Report month" type="month" value={month || data?.month || ''} onChange={event => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 260 }} />
    <Typography color="text.secondary">Recorded income and expenses across all accounts, including archived accounts. Opening balances, transfers and manual savings goals are excluded. Months still in progress are compared with the whole previous month.</Typography>
    <RemoteState remote={remote}>{data && <>
      <Typography>Comparing {data.month} with {data.previous_month}. Change is selected month minus previous month.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {[['income', 'Income'], ['expenses', 'Expenses'], ['net_cash_flow', 'Net cash flow']].map(([key, label]) => <Paper key={key} component="section" aria-label={label} variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          <Stack spacing={1}>
            <Typography component="h3" variant="h6">{label}</Typography>
            <Typography>Selected: {data.currency} {data.monthly[key]}</Typography>
            <Typography>Previous: {data.currency} {data.previous[key]}</Typography>
            <Typography>Change: {data.currency} {data.change[key]}</Typography>
          </Stack>
        </Paper>)}
      </Stack>
      <Stack component="section" aria-label="Spending by category" spacing={2}>
        <Typography component="h3" variant="h6">Spending by category</Typography>
        {data.spending_by_category.length === 0 && <Typography>No expenses recorded for this month.</Typography>}
        {data.spending_by_category.map(category => <Paper key={category.category_id} variant="outlined" sx={{ p: 2, overflowWrap: 'anywhere' }}>
          <Typography component="h4">{category.name}</Typography>
          <Typography>{data.currency} {category.amount}</Typography>
        </Paper>)}
      </Stack>
    </>}</RemoteState>
  </Stack>
}
