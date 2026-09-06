import { useState } from 'react'
import { Button, Paper, Stack } from '@mui/material'
import FormField from './FormField'

export default function BrowseControls({ fields, onApply }) {
  const [values, setValues] = useState({ sort: 'date', direction: 'desc', per_page: '20' })
  return <Paper component="form" variant="outlined" sx={{ p: 2 }} onSubmit={event => { event.preventDefault(); onApply(values) }}>
    <Stack spacing={2}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        {[...fields,
          { name: 'sort', label: 'Sort by', options: [{ value: 'date', label: 'Date' }, { value: 'amount', label: 'Amount' }, { value: 'description', label: 'Description' }] },
          { name: 'direction', label: 'Sort direction', options: [{ value: 'desc', label: 'Descending' }, { value: 'asc', label: 'Ascending' }] },
          { name: 'per_page', label: 'Results per page', options: [10, 20, 50, 100].map(size => ({ value: String(size), label: String(size) })) },
        ].map(field => <FormField key={field.name} field={{ required: false, ...field, sx: { flex: '1 1 180px', minWidth: 0 } }} value={values[field.name]} onChange={value => setValues(current => ({ ...current, [field.name]: value }))} />)}
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="outlined">Apply filters</Button>
        <Button onClick={() => { const defaults = { sort: 'date', direction: 'desc', per_page: '20' }; setValues(defaults); onApply(defaults) }}>Reset filters</Button>
      </Stack>
    </Stack>
  </Paper>
}
