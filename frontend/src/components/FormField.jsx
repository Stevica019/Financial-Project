import { TextField } from '@mui/material'
import { useId } from 'react'

export default function FormField({ field, value, onChange, error, disabled }) {
  const id = useId()
  const { name, label, options, type = 'text', required = true, hint, ...rest } = field
  return <TextField
    id={`${id}-${name}`} name={name} label={label} value={value ?? ''} onChange={event => onChange(event.target.value)}
    type={type} required={required} fullWidth disabled={disabled} error={Boolean(error)} helperText={error ?? hint}
    select={Boolean(options)}
    slotProps={{
      ...(options ? { select: { native: true } } : {}),
      ...(type === 'date' ? { inputLabel: { shrink: true } } : {}),
    }}
    {...rest}
  >{options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</TextField>
}
