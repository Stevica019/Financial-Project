import { useState } from 'react'
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useRemote } from '../useRemote'
import { useWorkspace } from '../workspace'
import { formatMoney, formatMonth } from '../format'
import RemoteState from '../components/RemoteState'
import BudgetProgress from '../components/BudgetProgress'
import GoalProgress from '../components/GoalProgress'
import ActivityRow from '../components/ActivityRow'
import Icon from '../components/Icon'

function SummaryCard({ label, amount, currency, icon, tone }) {
  return <Paper component="section" aria-label={label} variant="outlined" className="summary-card" sx={{ p: 3, flex: '1 1 200px', minWidth: 0 }}>
    <Box className={`metric-icon ${tone || ''}`}><Icon name={icon} fontSize="small" /></Box>
    <Typography component="h3" variant="subtitle2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" className="money" sx={{ mt: 1, overflowWrap: 'anywhere' }}>{formatMoney(amount, currency)}</Typography>
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
  const { openActivity } = useWorkspace()
  const remote = useRemote(`/dashboard${month ? `?month=${encodeURIComponent(month)}` : ''}`)
  const data = remote.data
  return <Stack spacing={3} sx={{ width: '100%' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
      <Box>
      <Typography component="h1" variant="h5">Financial overview</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>Your everyday finances, all in one place.</Typography>
      </Box>
      <Button startIcon={<Icon name="refresh" />} disabled={remote.loading} onClick={remote.reload} sx={{ alignSelf: { xs: 'start', sm: 'center' } }}>Refresh</Button>
    </Stack>
    <RemoteState remote={remote}>
      {data && <>
        <Paper component="section" aria-label="Total balance" className="balance-hero">
          <Box className="balance-orbit" aria-hidden="true"><span /><span /><span /></Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}><Icon name="wallet" fontSize="small" /><Typography component="h3" variant="overline">Total balance</Typography><span className="hero-badge">ALL ACCOUNTS</span></Stack>
            <Typography className="balance-amount money">{formatMoney(data.total_balance, data.currency)}</Typography>
            <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mt: 3.5 }}>
              <Button className="gold-button" variant="contained" startIcon={<Icon name="plus" />} onClick={() => openActivity({ kind: 'expense' })}>Add transaction</Button>
              <Button className="hero-secondary" variant="outlined" startIcon={<Icon name="activity" />} onClick={() => openActivity({ kind: 'transfer' })}>Transfer money</Button>
            </Stack>
          </Box>
        </Paper>
        <Stack component="section" aria-label="Monthly summary" spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography component="h2" variant="h6">Monthly summary</Typography>
            <TextField label="Summary month" type="month" size="small" value={month || data.month || ''} onChange={event => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 185 }} />
          </Stack>
          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
            <SummaryCard label="Monthly income" amount={data.monthly.income} currency={data.currency} icon="income" />
            <SummaryCard label="Monthly expenses" amount={data.monthly.expenses} currency={data.currency} icon="expense" tone="gold" />
            <SummaryCard label="Net cash flow" amount={data.monthly.net_cash_flow} currency={data.currency} icon="chart" />
          </Stack>
        </Stack>
        <Box className="overview-grid">
        <DashboardPanel title="Monthly budgets" eyebrow="SPEND WITH INTENTION" to="/budgets" action="Manage budgets" description={formatMonth(data.month)}>
          {!data.budgets?.length && <Box className="empty-state"><Icon name="wallet" /><Typography>No budgets for this month.</Typography><Typography variant="body2" color="text.secondary">Give your spending a little direction.</Typography></Box>}
          {data.budgets?.map(budget => <Paper key={budget.id} variant="outlined" sx={{ p: 2 }}>
            <Typography component="h4">{budget.name}</Typography>
            <BudgetProgress budget={budget} currency={data.currency} />
          </Paper>)}
        </DashboardPanel>
        <DashboardPanel title="Active savings goals" eyebrow="MAKE SPACE FOR TOMORROW" to="/goals" action="Manage savings goals">
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
              <Typography className="money" sx={{ overflowWrap: 'anywhere' }}>{formatMoney(account.balance, data.currency)}</Typography>
              <Button component={Link} to={`/accounts/${account.id}/history`} sx={{ alignSelf: 'start' }}>View history</Button>
            </Stack>
          </Paper>)}
        </DashboardPanel>
        <DashboardPanel title="Recent activity" eyebrow="MONEY IN MOTION" to="/transactions" action="View transactions">
          {data.recent_activity.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}>No activity yet. Record income, an expense or a transfer to see it here.</Paper>}
          {data.recent_activity.length > 0 && <Paper variant="outlined" className="activity-list">
            {data.recent_activity.map(entry => <Box component="article" aria-label={entry.description || 'Transfer'} key={`${entry.kind}-${entry.id}`}>
              <ActivityRow entry={entry} currency={data.currency} onClick={() => openActivity({ record: entry })} />
            </Box>)}
          </Paper>}
        </DashboardPanel>
        </Box>
      </>}
    </RemoteState>
  </Stack>
}
