import { LinearProgress, Stack, Typography } from '@mui/material'

export default function GoalProgress({ goal, currency }) {
  return <Stack spacing={1} sx={{ overflowWrap: 'anywhere' }}>
    <Typography>Saved: {currency} {goal.current_amount} of {currency} {goal.target_amount}</Typography>
    <Typography>Remaining: {currency} {goal.remaining} · {goal.percentage}% reached</Typography>
    <LinearProgress aria-label={`${goal.name} goal progress`} variant="determinate" value={Math.min(100, goal.percentage)} />
    <Typography>Status: {goal.status}</Typography>
    {goal.target_date && <Typography>Target date: {goal.target_date}</Typography>}
    {goal.description && <Typography color="text.secondary">{goal.description}</Typography>}
  </Stack>
}
