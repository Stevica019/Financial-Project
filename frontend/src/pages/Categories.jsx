import { Chip } from '@mui/material'
import ResourceManager from '../components/ResourceManager'

const fields = [
  { name: 'name', label: 'Category name' },
  { name: 'type', label: 'Category type', options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }] },
]

export default function Categories() {
  return <ResourceManager title="Categories" noun="category" endpoint="/categories" fields={fields} layout="grid"
    defaults={{ name: '', type: 'expense' }} introduction="Group your income and spending. Starter categories can be renamed or removed."
    details={category => <Chip size="small" label={category.type === 'income' ? 'Income' : 'Expense'} sx={{ alignSelf: 'start' }} />}
  />
}
