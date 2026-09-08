import { TextField } from '@mui/material'
import { useAppearance } from '../useAppearance'

export default function AppearanceControl() {
  const { preference, setPreference } = useAppearance()
  return <TextField select label="Appearance" value={preference} onChange={event => setPreference(event.target.value)}
    helperText="Saved automatically on this device. System follows your device’s theme."
    slotProps={{ select: { native: true } }} fullWidth>
    <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
  </TextField>
}
