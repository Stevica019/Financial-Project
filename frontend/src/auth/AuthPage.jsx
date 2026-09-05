import { useState } from 'react'
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { requestError } from '../api'
import { useAuth } from './useAuth'

export default function AuthPage({ register = false }) {
  const { submit } = useAuth()
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setErrors({})
    setMessage('')
    setBusy(true)
    try {
      await submit(register ? 'register' : 'login', values)
    } catch (error) {
      setErrors(error.response?.status === 422 ? error.response.data.errors ?? {} : {})
      setMessage(requestError(error))
    } finally {
      setBusy(false)
    }
  }

  function field(name, label, options = {}) {
    return <TextField
      key={name} id={name} name={name} label={label} fullWidth required disabled={busy}
      {...options} error={Boolean(errors[name])} helperText={errors[name]?.[0] ?? options.helperText}
    />
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, width: '100%', maxWidth: 460 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>{register ? 'Create your account' : 'Welcome back'}</Typography>
          <Typography color="text.secondary">{register ? 'Start building a clearer picture of your finances.' : 'Sign in to your personal finance workspace.'}</Typography>
        </Box>
        {message && <Alert severity="error">{message}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {register && field('name', 'Name', { autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {field('password', 'Password', {
              type: 'password', autoComplete: register ? 'new-password' : 'current-password',
              helperText: register ? 'Use at least 12 characters.' : undefined,
            })}
            {register && field('password_confirmation', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {register ? 'Already have an account? ' : 'New here? '}
          <Link component={RouterLink} to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link>
        </Typography>
      </Stack>
    </Paper>
  )
}
