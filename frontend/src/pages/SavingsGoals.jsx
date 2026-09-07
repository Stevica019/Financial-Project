import { useAuth } from '../auth/useAuth'
import ResourceManager from '../components/ResourceManager'
import GoalProgress from '../components/GoalProgress'

export default function SavingsGoals() {
  const { user } = useAuth()
  return <ResourceManager title="Savings goals" noun="goal" endpoint="/savings-goals"
    introduction="Track progress manually: these amounts do not reserve money, create transactions or change account balances. Edit a goal to update saved progress or mark it completed or cancelled. Status is your choice, even when the target is reached. Currency cannot change while goals exist."
    defaults={{ name: '', target_amount: '', current_amount: '0.00', target_date: '', description: '', status: 'active' }}
    fields={[
      { name: 'name', label: 'Goal name' },
      { name: 'target_amount', label: `Target amount (${user.currency})` },
      { name: 'current_amount', label: `Saved amount (${user.currency})`, hint: 'Enter the total saved so far, not an additional contribution. Overfunding is allowed.' },
      { name: 'target_date', label: 'Target date', type: 'date', required: false, slotProps: { inputLabel: { shrink: true } } },
      { name: 'description', label: 'Description', required: false, multiline: true },
      { name: 'status', label: 'Status', options: ['active', 'completed', 'cancelled'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
    ]}
    details={goal => <GoalProgress goal={goal} currency={user.currency} />} />
}
