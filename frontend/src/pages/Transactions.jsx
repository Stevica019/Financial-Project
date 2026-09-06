import { Link, useParams } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import TransferDetails from '../components/TransferDetails'
import { browseFields, transferFields } from '../components/activityFields'

export default function Transactions() {
  const { accountId } = useParams()
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  const account = accounts.data?.data.find(item => String(item.id) === accountId)
  const fields = (values, initial) => [
    { name: 'type', label: 'Entry type', options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }], resetFields: ['category_id'] },
    { name: 'account_id', label: 'Account', options: [{ value: '', label: 'Choose an account' }, ...accounts.data.data.filter(item => item.is_active || (initial.id && item.id === initial.account_id)).map(item => ({ value: item.id, label: `${item.name}${item.is_active ? '' : ' (archived)'}` }))] },
    { name: 'category_id', label: 'Category', options: [{ value: '', label: 'Choose a category' }, ...categories.data.data.filter(item => item.type === values.type).map(item => ({ value: item.id, label: item.name }))] },
    { name: 'amount', label: `Amount (${user.currency})`, hint: 'Enter a positive amount, for example 25.50.' },
    { name: 'date', label: 'Activity date', type: 'date' },
    { name: 'description', label: 'Description', slotProps: { htmlInput: { maxLength: 255 } } },
    { name: 'notes', label: 'Notes', required: false, multiline: true, minRows: 2 },
  ]
  return <RemoteState remote={accounts}><RemoteState remote={categories}><RemoteState remote={settings}>
    {accounts.data && categories.data && settings.data && <Stack spacing={2}>
      {accountId && <Button component={Link} to="/accounts" sx={{ alignSelf: 'flex-start' }}>Back to accounts</Button>}
      {accountId && <Button component={Link} to="/transfers" sx={{ alignSelf: 'flex-start' }}>Manage transfers</Button>}
      {accountId && !account ? <Typography>Account not found.</Typography> : <ResourceManager
        key={accountId ?? 'all'} title={accountId ? `${account.name} history` : 'Transactions'} noun="entry"
        endpoint={accountId ? `/accounts/${accountId}/history` : '/transactions'} writeEndpoint="/transactions"
        fields={fields} defaults={{ type: 'expense', account_id: account?.is_active ? account.id : '', category_id: '', amount: '', date: settings.data.today, description: '', notes: '' }}
        onSaved={accounts.refresh}
        browseFields={browseFields(accounts.data.data, categories.data.data, { history: Boolean(accountId) })}
        recordConfig={record => record?.kind === 'transfer' ? { noun: 'transfer', endpoint: '/transfers', fields: transferFields(accounts.data.data, user.currency), defaults: {} } : {}}
        introduction={accountId ? `Current balance: ${user.currency} ${account.balance}. Opening balance: ${user.currency} ${account.opening_balance} on ${account.opening_date}.${account.is_active ? '' : ' Archived: you can correct existing entries.'}` : 'Record income and expenses. Create an account and a matching category before adding an entry. Entries are shown newest first.'}
        details={entry => entry.kind === 'transfer' ? <TransferDetails entry={entry} currency={user.currency} accountId={accountId} /> : <Stack spacing={1}>
          <Typography>{entry.type === 'income' ? 'Income' : 'Expense'}: {user.currency} {entry.amount}</Typography>
          <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{entry.date} · {entry.account_name} · {entry.category_name}</Typography>
          {entry.notes && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{entry.notes}</Typography>}
        </Stack>}
      />}
    </Stack>}
  </RemoteState></RemoteState></RemoteState>
}
