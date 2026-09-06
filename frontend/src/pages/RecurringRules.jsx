import { Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'

export default function RecurringRules() {
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  return <RemoteState remote={accounts}><RemoteState remote={categories}><RemoteState remote={settings}>
    {accounts.data && categories.data && settings.data && <ResourceManager title="Recurring transactions" noun="rule" endpoint="/recurring-rules" archivable archiveLabels={['Pause', 'Resume']}
      introduction="Due dates create income or expense entries when the scheduler runs. A past start date catches up missed entries. Pausing skips dates until resumed; edits apply from today onward. Deleting a rule keeps its generated entries. Month-end dates retain their original anchor."
      defaults={{ type: 'expense', account_id: '', category_id: '', amount: '', description: '', notes: '', frequency: 'monthly', start_date: settings.data.today, end_date: '' }}
      fields={(values, initial) => [
        { name: 'type', label: 'Entry type', options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }], resetFields: ['category_id'] },
        { name: 'account_id', label: 'Account', options: [{ value: '', label: 'Choose an account' }, ...accounts.data.data.filter(item => item.is_active || item.id === initial.account_id).map(item => ({ value: item.id, label: `${item.name}${item.is_active ? '' : ' (archived)'}` }))] },
        { name: 'category_id', label: 'Category', options: [{ value: '', label: 'Choose a category' }, ...categories.data.data.filter(item => item.type === values.type).map(item => ({ value: item.id, label: item.name }))] },
        { name: 'amount', label: `Amount (${user.currency})` },
        { name: 'description', label: 'Description' },
        { name: 'frequency', label: 'Frequency', options: ['daily', 'weekly', 'monthly', 'yearly'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
        { name: 'start_date', label: 'Start date', type: 'date' },
        { name: 'end_date', label: 'End date (inclusive)', type: 'date', required: false },
        { name: 'notes', label: 'Notes', required: false, multiline: true },
      ]}
      details={rule => <Stack spacing={1}>
        <Typography>{rule.type === 'income' ? 'Income' : 'Expense'}: {user.currency} {rule.amount} · {rule.frequency}</Typography>
        <Typography>{rule.account_name} · {rule.category_name}</Typography>
        <Typography>{rule.is_active ? `Next execution: ${rule.next_execution_date}` : rule.next_execution_date ? 'Paused' : 'Completed'} · Starts {rule.start_date}{rule.end_date ? ` · Ends ${rule.end_date}` : ''}</Typography>
      </Stack>} />}
  </RemoteState></RemoteState></RemoteState>
}
