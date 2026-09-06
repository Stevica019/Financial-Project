import { Button, Chip, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'

const typeName = value => value.replaceAll('_', ' ')

export default function Accounts() {
  const { user, updateUser } = useAuth()
  const remote = useRemote('/settings')
  const fields = remote.data ? [
    { name: 'name', label: 'Account name' },
    { name: 'type', label: 'Account type', options: remote.data.account_types.map(type => ({ value: type, label: typeName(type) })) },
    { name: 'opening_balance', label: `Opening balance (${user.currency})`, hint: 'Use a dot for decimals, for example 1250.50. Debt can be negative.' },
    { name: 'opening_date', label: 'Opening date', type: 'date', hint: 'Balance at the start of this date. You will record activity from this date onward.' },
    { name: 'description', label: 'Description', required: false, multiline: true, minRows: 2 },
  ] : []
  return <RemoteState remote={remote}>
    {remote.data && <ResourceManager title="Accounts" noun="account" endpoint="/accounts" fields={fields}
      defaults={{ name: '', type: 'checking', opening_balance: '0.00', opening_date: remote.data.today, description: '' }} archivable
      onSaved={() => updateUser({ currency_locked: true })}
      introduction="Add the places where you keep money. Balances include recorded income and expenses. Archive accounts you no longer use to preserve their history."
      details={account => <Stack spacing={1}>
        <Stack direction="row" spacing={1}><Chip label={typeName(account.type)} size="small" /><Chip label={account.is_active ? 'Active' : 'Archived'} size="small" variant="outlined" /></Stack>
        <Typography>Opening balance: {user.currency} {account.opening_balance}</Typography>
        <Typography>Current balance: {user.currency} {account.balance}</Typography>
        <Button component={Link} to={`/accounts/${account.id}/history`} sx={{ alignSelf: 'flex-start' }}>View history</Button>
        <Typography variant="body2" color="text.secondary">Opening date: {account.opening_date}</Typography>
        {account.description && <Typography sx={{ overflowWrap: 'anywhere' }}>{account.description}</Typography>}
      </Stack>}
    />}
  </RemoteState>
}
