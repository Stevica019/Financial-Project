export function browseFields(accounts, categories, { history = false, transfers = false } = {}) {
  const all = label => ({ value: '', label })
  return [
    { name: 'search', label: transfers ? 'Search description' : 'Search description or notes' },
    ...(!history ? [{ name: 'account_id', label: 'Filter account', options: [all('All accounts'), ...accounts.map(a => ({ value: a.id, label: a.name }))] }] : []),
    ...(!transfers ? [
      { name: 'category_id', label: 'Filter category', options: [all('All categories'), ...categories.map(c => ({ value: c.id, label: `${c.name} (${c.type})` }))] },
      { name: 'type', label: 'Filter type', options: [all('All types'), { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, ...(history ? [{ value: 'transfer', label: 'Transfer' }] : [])] },
    ] : []),
    { name: 'date_from', label: 'From date', type: 'date' },
    { name: 'date_to', label: 'To date', type: 'date' },
    { name: 'amount_min', label: 'Minimum amount' },
    { name: 'amount_max', label: 'Maximum amount' },
  ]
}
