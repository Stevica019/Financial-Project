import { useState } from 'react'
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import TransferDetails from '../components/TransferDetails'
import BudgetProgress from '../components/BudgetProgress'
import GoalProgress from '../components/GoalProgress'
import Icon from '../components/Icon'

function SummaryCard({ label, amount, currency, icon, tone }) {
  return <Paper component="section" aria-label={label} variant="outlined" className="summary-card" sx={{ p: 3, flex: '1 1 200px', minWidth: 0 }}>
    <Box className={`metric-icon ${tone || ''}`}><Icon name={icon} fontSize="small" /></Box>
    <Typography component="h3" variant="subtitle2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" className="money" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{currency} {amount}</Typography>
  </Paper>
}

function DashboardPanel({ title, eyebrow, description, to, action, children }) {
  return <Stack component="section" className="dashboard-panel" aria-label={title} spacing={2}>
    <Box>
      <Typography variant="overline" color="text.secondary">{eyebrow}</Typography>
      <Typography component="h3" variant="h6" sx={{ mt: 1 }}>{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>}
    </Box>
    <Stack className="dashboard-panel-content" spacing={2} tabIndex={0} role="region" aria-label={`${title} items`}>
      {children}
    </Stack>
    <Button component={Link} to={to} endIcon={<Icon name="arrow" />} sx={{ alignSelf: 'start' }}>{action}</Button>
  </Stack>
}

export default function Overview() {
  const [month, setMonth] = useState('')
  const remote = useRemote(`/dashboard${month ? `?month=${encodeURIComponent(month)}` : ''}`)
  const data = remote.data
  return <Stack spacing={3} sx={{ width: '100%' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
      <Box>
      <Typography component="h1" variant="h5">Financial overview</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>Your everyday finances, all in one place.</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField label="Summary month" type="month" size="small" value={month || data?.month || ''} onChange={event => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 185 }} />
        <Button startIcon={<Icon name="refresh" />} disabled={remote.loading} onClick={remote.reload}>Refresh</Button>
      </Stack>
    </Stack>
    <RemoteState remote={remote}>
      {data && <>
        <Paper component="section" aria-label="Total balance" className="balance-hero">
          <Box className="balance-orbit" aria-hidden="true"><span /><span /><span /></Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}><Icon name="wallet" fontSize="small" /><Typography component="h3" variant="overline">Total balance</Typography><span className="hero-badge">ALL ACCOUNTS</span></Stack>
            <Typography className="balance-amount money">{data.currency} {data.total_balance}</Typography>
            <Typography variant="body2" sx={{ color: '#bdcce2', mt: 1 }}>Includes every account, including archived accounts.</Typography>
            <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mt: 3.5 }}>
              <Button component={Link} to="/transactions" className="gold-button" variant="contained" startIcon={<Icon name="plus" />}>Record income or expenses</Button>
              <Button component={Link} to="/transfers" className="hero-secondary" variant="outlined" startIcon={<Icon name="activity" />}>Make a transfer</Button>
            </Stack>
          </Box>
        </Paper>
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          <SummaryCard label="Monthly income" amount={data.monthly.income} currency={data.currency} icon="income" />
          <SummaryCard label="Monthly expenses" amount={data.monthly.expenses} currency={data.currency} icon="expense" tone="gold" />
          <SummaryCard label="Net cash flow" amount={data.monthly.net_cash_flow} currency={data.currency} icon="chart" />
        </Stack>
        <Typography variant="body2" color="text.secondary">The selected month controls income, expenses, net cash flow and budgets. Net cash flow excludes opening balances and transfers. Balances and recent activity cover all dates.</Typography>
        <Box className="overview-grid">
        <DashboardPanel title="Monthly budgets" eyebrow="SPEND WITH INTENTION" to="/budgets" action="Manage budgets">
          {!data.budgets?.length && <Box className="empty-state"><Icon name="wallet" /><Typography>No budgets for this month.</Typography><Typography variant="body2" color="text.secondary">Give your spending a little direction.</Typography></Box>}
          {data.budgets?.map(budget => <Paper key={budget.id} variant="outlined" sx={{ p: 2 }}>
            <Typography component="h4">{budget.name}</Typography>
            <BudgetProgress budget={budget} currency={data.currency} />
          </Paper>)}
        </DashboardPanel>
        <DashboardPanel title="Active savings goals" eyebrow="MAKE SPACE FOR TOMORROW" to="/goals" action="Manage savings goals"
          description="Manually tracked progress across all dates. Goals do not reserve money or affect balances.">
          {!data.goals?.length && <Box className="empty-state"><Icon name="goal" /><Typography>No active savings goals.</Typography><Typography variant="body2" color="text.secondary">Big plans start with a small first step.</Typography></Box>}
          {data.goals?.map(goal => <Paper key={goal.id} variant="outlined" sx={{ p: 2 }}>
            <Typography component="h4" sx={{ overflowWrap: 'anywhere' }}>{goal.name}</Typography>
            <GoalProgress goal={goal} currency={data.currency} />
          </Paper>)}
        </DashboardPanel>
        <DashboardPanel title="Account balances" eyebrow="THE BIGGER PICTURE" to="/accounts" action="Manage accounts">
          {data.accounts.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}>No accounts yet. Add an account to start tracking your money.</Paper>}
          {data.accounts.map(account => <Paper component="article" aria-label={account.name} key={account.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
              <Typography component="h4" variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>{account.name}</Typography>
              {!account.is_active && <Chip label="Archived" size="small" sx={{ alignSelf: 'start' }} />}
              <Typography sx={{ overflowWrap: 'anywhere' }}>{data.currency} {account.balance}</Typography>
              <Button component={Link} to={`/accounts/${account.id}/history`} sx={{ alignSelf: 'start' }}>View history</Button>
            </Stack>
          </Paper>)}
        </DashboardPanel>
        <DashboardPanel title="Recent activity" eyebrow="MONEY IN MOTION" to="/transactions" action="View transactions"
          description="Latest 10 entries and transfers, ordered by activity date.">
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
        </DashboardPanel>
        </Box>
      </>}
    </RemoteState>
  </Stack>
}
