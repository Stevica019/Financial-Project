import { TextField } from '@mui/material'

export default function FormField({ field, value, onChange, error, disabled }) {
  const { name, label, options, type = 'text', required = true, hint, ...rest } = field
  return <TextField
    id={name} name={name} label={label} value={value ?? ''} onChange={event => onChange(event.target.value)}
    type={type} required={required} fullWidth disabled={disabled} error={Boolean(error)} helperText={error ?? hint}
    select={Boolean(options)}
    slotProps={{
      ...(options ? { select: { native: true } } : {}),
      ...(type === 'date' ? { inputLabel: { shrink: true } } : {}),
    }}
    {...rest}
  >{options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</TextField>
}
