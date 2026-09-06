import { Stack, Typography } from '@mui/material'

export default function TransferDetails({ entry, currency, accountId }) {
  const direction = accountId ? (String(entry.source_account_id) === String(accountId) ? 'Transfer out' : 'Transfer in') : 'Transfer'
  return <Stack spacing={1} sx={{ overflowWrap: 'anywhere' }}>
    <Typography>{direction}: {currency} {entry.amount}</Typography>
    <Typography color="text.secondary">{entry.date} · {entry.source_account_name} → {entry.destination_account_name}</Typography>
  </Stack>
}
