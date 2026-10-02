import { LinearProgress, Stack, Typography } from '@mui/material'
import { formatDate, formatMoney } from '../format'

export default function GoalProgress({ goal, currency }) {
  return <Stack spacing={1} sx={{ overflowWrap: 'anywhere' }}>
    <Typography>Saved: {formatMoney(goal.current_amount, currency)} of {formatMoney(goal.target_amount, currency)}</Typography>
    <Typography>Remaining: {formatMoney(goal.remaining, currency)} · {goal.percentage}% reached</Typography>
    <LinearProgress aria-label={`${goal.name} goal progress`} variant="determinate" value={Math.min(100, goal.percentage)} />
    <Typography>Status: {goal.status}</Typography>
    {goal.target_date && <Typography>Target date: {formatDate(goal.target_date)}</Typography>}
    {goal.description && <Typography color="text.secondary">{goal.description}</Typography>}
  </Stack>
}
