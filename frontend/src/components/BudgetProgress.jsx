import { LinearProgress, Stack, Typography } from '@mui/material'
import { formatMoney } from '../format'

export default function BudgetProgress({ budget, currency }) {
  return <Stack spacing={1}>
    <Typography>Limit: {formatMoney(budget.amount, currency)} · Spent: {formatMoney(budget.spent, currency)}</Typography>
    <Typography color={budget.remaining.startsWith('-') ? 'error' : 'text.secondary'}>Remaining: {formatMoney(budget.remaining, currency)} · {budget.percentage}% used</Typography>
    <LinearProgress aria-label={`${budget.name} budget usage`} variant="determinate" value={Math.min(100, budget.percentage)} color={budget.percentage > 100 ? 'error' : 'primary'} />
  </Stack>
}
