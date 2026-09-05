import { Container, CssBaseline, Paper, Stack, Typography } from '@mui/material'

export default function App() {
  return (
    <>
      <CssBaseline />
      <Container component="main" maxWidth="md" sx={{ py: { xs: 5, md: 12 } }}>
        <Stack spacing={3}>
          <Typography variant="overline" color="text.secondary">Personal Finance</Typography>
          <Typography variant="h3" component="h1">A clearer view of your money.</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            Keep your accounts, daily spending, and financial goals in one place.
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>Getting started</Typography>
            <Typography color="text.secondary">
              This app is under construction. Account registration and sign-in are coming next.
            </Typography>
          </Paper>
        </Stack>
      </Container>
    </>
  )
}