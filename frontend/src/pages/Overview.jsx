import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function Overview() {
  return <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
    <Stack spacing={2}>
      <Typography variant="h6" component="h2">Set up your financial overview</Typography>
      <Typography color="text.secondary">Add your accounts and organize your categories. Transactions and financial summaries are coming next.</Typography>
      <Button component={Link} to="/accounts" variant="contained" sx={{ alignSelf: 'start' }}>Manage accounts</Button>
    </Stack>
  </Paper>
}
