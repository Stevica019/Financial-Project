import { TextField } from '@mui/material'
import { useId } from 'react'

export default function FormField({ field, value, onChange, error, disabled }) {
  const id = useId()
  const { name, label, options, type = 'text', required = true, hint, slotProps = {}, ...rest } = field
  return <TextField
    id={`${id}-${name}`} name={name} label={label} value={value ?? ''} onChange={event => onChange(event.target.value)}
    type={type} required={required} fullWidth disabled={disabled} error={Boolean(error)} helperText={error ?? hint}
    select={Boolean(options)}
    slotProps={{
      ...slotProps,
      ...(options ? { select: { native: true, ...slotProps.select } } : {}),
      inputLabel: {
        ...(options || ['date', 'month', 'time'].includes(type) || rest.placeholder ? { shrink: true } : {}),
        ...slotProps.inputLabel,
      },
    }}
    {...rest}
  >{options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</TextField>
}
