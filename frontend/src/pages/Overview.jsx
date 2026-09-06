import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function Overview() {
  return <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
    <Stack spacing={2}>
      <Typography variant="h6" component="h2">Set up your financial overview</Typography>
      <Typography color="text.secondary">Manage your accounts and categories, record income and expenses, and view balances and account history. Financial summaries are coming in a later milestone.</Typography>
      <Button component={Link} to="/accounts" variant="contained" sx={{ alignSelf: 'start' }}>Manage accounts</Button>
      <Button component={Link} to="/transactions" sx={{ alignSelf: 'start' }}>Record income or expenses</Button>
    </Stack>
  </Paper>
}
