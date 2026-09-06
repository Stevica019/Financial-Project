import { LinearProgress, Stack, Typography } from '@mui/material'

export default function BudgetProgress({ budget, currency }) {
  return <Stack spacing={1}>
    <Typography>Limit: {currency} {budget.amount} · Spent: {currency} {budget.spent}</Typography>
    <Typography color={budget.remaining.startsWith('-') ? 'error' : 'text.secondary'}>Remaining: {currency} {budget.remaining} · {budget.percentage}% used</Typography>
    <LinearProgress aria-label={`${budget.name} budget usage`} variant="determinate" value={Math.min(100, budget.percentage)} color={budget.percentage > 100 ? 'error' : 'primary'} />
  </Stack>
}
