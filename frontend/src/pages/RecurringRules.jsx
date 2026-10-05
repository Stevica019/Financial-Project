import { Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import { ActivityTabs } from '../components/SectionTabs'
import { formatDate, formatMoney } from '../format'

export default function RecurringRules() {
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  return <RemoteState remote={accounts}><RemoteState remote={categories}><RemoteState remote={settings}>
    {accounts.data && categories.data && settings.data && <ResourceManager title="Activity" noun="rule" plural="scheduled transactions" tabs={<ActivityTabs />} endpoint="/recurring-rules" archivable archiveLabels={['Pause', 'Resume']}
      introduction="Income and expenses that repeat on a schedule. Pause a rule to skip its due dates until you resume it."
      deleteNote="Entries it already created are kept."
      defaults={{ type: 'expense', account_id: '', category_id: '', amount: '', description: '', notes: '', frequency: 'monthly', start_date: settings.data.today, end_date: '' }}
      fields={(values, initial) => [
        { name: 'type', label: 'Entry type', options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }], resetFields: ['category_id'] },
        { name: 'account_id', label: 'Account', options: [{ value: '', label: 'Choose an account' }, ...accounts.data.data.filter(item => item.is_active || item.id === initial.account_id).map(item => ({ value: item.id, label: `${item.name}${item.is_active ? '' : ' (archived)'}` }))] },
        { name: 'category_id', label: 'Category', options: [{ value: '', label: 'Choose a category' }, ...categories.data.data.filter(item => item.type === values.type).map(item => ({ value: item.id, label: item.name }))] },
        { name: 'amount', label: `Amount (${user.currency})` },
        { name: 'description', label: 'Description' },
        { name: 'frequency', label: 'Frequency', options: ['daily', 'weekly', 'monthly', 'yearly'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })), hint: ['monthly', 'yearly'].includes(values.frequency) ? 'Rules that start on the 29th to 31st use the last day of shorter months.' : undefined },
        { name: 'start_date', label: 'Start date', type: 'date', hint: initial.id ? 'Changes apply from today onward.' : 'A past start date also records the entries it missed.' },
        { name: 'end_date', label: 'End date (inclusive)', type: 'date', required: false },
        { name: 'notes', label: 'Notes', required: false, multiline: true },
      ]}
      details={rule => <Stack spacing={1}>
        <Typography>{rule.type === 'income' ? 'Income' : 'Expense'}: {formatMoney(rule.amount, user.currency)} · {rule.frequency}</Typography>
        <Typography>{rule.account_name} · {rule.category_name}</Typography>
        <Typography>{rule.is_active ? `Next due: ${formatDate(rule.next_execution_date)}` : rule.next_execution_date ? 'Paused' : 'Completed'} · Starts {formatDate(rule.start_date)}{rule.end_date ? ` · Ends ${formatDate(rule.end_date)}` : ''}</Typography>
      </Stack>} />}
  </RemoteState></RemoteState></RemoteState>
}
