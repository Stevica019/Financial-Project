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

export function transferFields(accounts, currency) {
  return (_values, initial) => [
    ...[['source_account_id', 'Source account'], ['destination_account_id', 'Destination account']].map(([name, label]) => ({
      name, label, options: [{ value: '', label: 'Choose an account' }, ...accounts.filter(a => a.is_active || (initial.id && a.id === initial[name])).map(a => ({ value: a.id, label: `${a.name}${a.is_active ? '' : ' (archived)'}` }))],
    })),
    { name: 'amount', label: `Amount (${currency})`, hint: 'Enter a positive amount, for example 25.50.' },
    { name: 'date', label: 'Activity date', type: 'date' },
    { name: 'description', label: 'Description', required: false },
  ]
}
