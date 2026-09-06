import { useState } from 'react'
import { Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import TransferDetails from '../components/TransferDetails'

function SummaryCard({ label, amount, currency }) {
  return <Paper component="section" aria-label={label} variant="outlined" sx={{ p: 3, flexGrow: 1, minWidth: 0, borderRadius: 3 }}>
    <Typography component="h3" variant="subtitle2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{currency} {amount}</Typography>
  </Paper>
}

export default function Overview() {
  const [month, setMonth] = useState('')
  const remote = useRemote(`/dashboard${month ? `?month=${encodeURIComponent(month)}` : ''}`)
  const data = remote.data
  return <Stack spacing={3} sx={{ width: '100%' }}>
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography component="h2" variant="h5">Financial overview</Typography>
      <Button disabled={remote.loading} onClick={remote.reload}>Refresh</Button>
    </Stack>
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      <Button component={Link} to="/transactions" variant="contained">Record income or expenses</Button>
      <Button component={Link} to="/transfers" variant="outlined">Make a transfer</Button>
      <Button component={Link} to="/accounts">Manage accounts</Button>
    </Stack>
    <Stack spacing={1}>
      <TextField label="Summary month" type="month" value={month || data?.month || ''} onChange={event => setMonth(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 260 }} />
      <Typography variant="body2" color="text.secondary">The month controls income, expenses and net cash flow. Balances and recent activity cover all dates.</Typography>
    </Stack>
    <RemoteState remote={remote}>
      {data && <>
        <SummaryCard label="Total balance" amount={data.total_balance} currency={data.currency} />
        <Typography variant="body2" color="text.secondary">Includes every account, including archived accounts.</Typography>
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          <SummaryCard label="Monthly income" amount={data.monthly.income} currency={data.currency} />
          <SummaryCard label="Monthly expenses" amount={data.monthly.expenses} currency={data.currency} />
          <SummaryCard label="Net cash flow" amount={data.monthly.net_cash_flow} currency={data.currency} />
        </Stack>
        <Typography variant="body2" color="text.secondary">Net cash flow is income minus expenses. Opening balances and transfers are excluded.</Typography>
        <Stack component="section" aria-label="Account balances" spacing={2}>
          <Typography component="h3" variant="h6">Account balances</Typography>
          {data.accounts.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}>No accounts yet. Add an account to start tracking your money.</Paper>}
          {data.accounts.map(account => <Paper component="article" aria-label={account.name} key={account.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
              <Typography component="h4" variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>{account.name}</Typography>
              {!account.is_active && <Chip label="Archived" size="small" sx={{ alignSelf: 'start' }} />}
              <Typography sx={{ overflowWrap: 'anywhere' }}>{data.currency} {account.balance}</Typography>
              <Button component={Link} to={`/accounts/${account.id}/history`} sx={{ alignSelf: 'start' }}>View history</Button>
            </Stack>
          </Paper>)}
        </Stack>
        <Stack component="section" aria-label="Recent activity" spacing={2}>
          <Typography component="h3" variant="h6">Recent activity</Typography>
          <Typography color="text.secondary">Latest 10 entries and transfers, ordered by activity date.</Typography>
          {data.recent_activity.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}>No activity yet. Record income, an expense or a transfer to see it here.</Paper>}
          {data.recent_activity.map(entry => <Paper component="article" aria-label={entry.description || 'Transfer'} key={`${entry.kind}-${entry.id}`} variant="outlined" sx={{ p: 2, borderRadius: 3, overflowWrap: 'anywhere' }}>
            <Stack spacing={1}>
              <Typography component="h4" variant="subtitle1">{entry.description || 'Transfer'}</Typography>
              {entry.kind === 'transfer' ? <TransferDetails entry={entry} currency={data.currency} /> : <>
                <Typography>{entry.type === 'income' ? 'Income' : 'Expense'}: {data.currency} {entry.amount}</Typography>
                <Typography color="text.secondary">{entry.date} · {entry.account_name} · {entry.category_name}</Typography>
              </>}
              <Button component={Link} to={entry.kind === 'transfer' ? '/transfers' : `/accounts/${entry.account_id}/history`} sx={{ alignSelf: 'start' }}>{entry.kind === 'transfer' ? 'Manage transfers' : 'View account history'}</Button>
            </Stack>
          </Paper>)}
        </Stack>
      </>}
    </RemoteState>
  </Stack>
}
