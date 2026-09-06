import { Alert, Button, LinearProgress } from '@mui/material'

export default function RemoteState({ remote, children }) {
  if (remote.loading) return <LinearProgress aria-label="Loading" />
  if (remote.error) return <Alert severity="error" action={<Button onClick={remote.reload} color="inherit">Try again</Button>}>{remote.error}</Alert>
  return children
}
