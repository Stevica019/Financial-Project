import { useState } from 'react'
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { requestError } from '../api'
import { useAuth } from './useAuth'
import Icon from '../components/Icon'

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
    <Box className="auth-layout page-enter">
    <Paper variant="outlined" className="auth-form" sx={{ p: { xs: 3, sm: 5 }, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Box className="form-emblem"><Icon name="wallet" /></Box>
          <Typography variant="overline" color="text.secondary">YOUR PERSONAL WORKSPACE</Typography>
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
    <Box className="auth-story">
      <Typography variant="overline" className="gold-text">A LITTLE CLARITY GOES A LONG WAY</Typography>
      <Typography component="h2" className="auth-headline">Your money. <br />Your life. <br /><span>In perspective.</span></Typography>
      <Typography className="auth-description">A calmer space to understand your spending, build better habits, and make room for what matters to you.</Typography>
      <Box className="auth-illustration" aria-hidden="true">
        <div className="illustration-orbit" />
        <div className="illustration-card"><span className="illustration-label">SMALL STEPS. BIG POSSIBILITIES.</span><Icon name="chart" /><div className="illustration-bars">{[28, 43, 37, 61, 55, 78, 92].map((height, index) => <span key={index} style={{ height: `${height}%`, '--bar-index': index }} />)}</div><span className="illustration-caption">A clearer path forward <span>↗</span></span></div>
        <div className="illustration-tag"><Icon name="goal" fontSize="small" /> Make every goal count.</div>
      </Box>
      <Box className="auth-features"><span><Icon name="wallet" /> Track your everyday</span><span><Icon name="goal" /> Plan your next chapter</span></Box>
    </Box>
    </Box>
  )
}
