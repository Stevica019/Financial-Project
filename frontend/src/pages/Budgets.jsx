import { useState } from 'react'
import { Stack, TextField } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import BudgetProgress from '../components/BudgetProgress'

export default function Budgets() {
  const { user } = useAuth()
  const [month, setMonth] = useState('')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  const selected = month || settings.data?.today.slice(0, 7) || ''
  return <RemoteState remote={categories}><RemoteState remote={settings}>
    {categories.data && settings.data && <Stack spacing={3}>
      <TextField label="Budget month" type="month" value={selected} onChange={event => setMonth(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <ResourceManager key={selected} title="Budgets" noun="budget" endpoint={`/budgets?month=${selected}`} writeEndpoint="/budgets"
        introduction="Monthly spending limits for your expense categories."
        defaults={{ category_id: '', amount: '', month: selected }}
        fields={[
          { name: 'category_id', label: 'Expense category', options: [{ value: '', label: 'Choose a category' }, ...categories.data.data.filter(item => item.type === 'expense').map(item => ({ value: item.id, label: item.name }))] },
          { name: 'amount', label: `Monthly limit (${user.currency})`, hint: 'Unused budget does not carry over to the next month.' },
          { name: 'month', label: 'Month', type: 'month', slotProps: { inputLabel: { shrink: true } } },
        ]}
        details={budget => <BudgetProgress budget={budget} currency={user.currency} />} />
    </Stack>}
  </RemoteState></RemoteState>
}
