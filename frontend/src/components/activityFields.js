import { formatDate, formatMoney } from '../format'

const amountChip = (prefix, currency) => value => `${prefix} ${/^\d+(\.\d+)?$/.test(value) ? formatMoney(value, currency) : value}`

// Filters for lists of income, expenses and transfers. An account history is already limited to one account.
// `search` sits in the toolbar; the rest open from the Filters button and show as chips (`chip` labels a value).
export function browseFields(accounts, categories, { history = false, currency, today } = {}) {
  const all = label => ({ value: '', label })
  return [
    { name: 'search', label: 'Search description or notes' },
    ...(!history ? [{ name: 'account_id', label: 'Account', options: [all('All accounts'), ...accounts.map(a => ({ value: a.id, label: a.name }))] }] : []),
    { name: 'category_id', label: 'Category', options: [all('All categories'), ...categories.map(c => ({ value: c.id, label: `${c.name} (${c.type})` }))] },
    { name: 'type', label: 'Type', options: [all('All types'), { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, { value: 'transfer', label: 'Transfer' }] },
    { name: 'date_from', label: 'From date', type: 'date', chip: value => `From ${formatDate(value, today)}` },
    { name: 'date_to', label: 'To date', type: 'date', chip: value => `To ${formatDate(value, today)}` },
    { name: 'amount_min', label: 'Minimum amount', chip: amountChip('Min', currency), slotProps: { htmlInput: { inputMode: 'decimal' } } },
    { name: 'amount_max', label: 'Maximum amount', chip: amountChip('Max', currency), slotProps: { htmlInput: { inputMode: 'decimal' } } },
  ]
}
