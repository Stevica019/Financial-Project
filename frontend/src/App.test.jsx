import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api, authenticate } from './api'
import { AuthProvider } from './auth/AuthContext'
import App from './App'

// Authentication tests isolate the dashboard's independent data requests.
vi.mock('./pages/Overview', () => ({ default: () => <h2>Financial overview</h2> }))

vi.mock('./api', async importOriginal => ({
  ...await importOriginal(),
  api: {
    get: vi.fn(), post: vi.fn(),
    interceptors: { response: { use: vi.fn(), eject: vi.fn() } },
  },
  authenticate: vi.fn(),
}))

const user = { id: 1, name: 'Alex', email: 'alex@example.com', currency: 'EUR', timezone: 'UTC', currency_locked: false }

beforeEach(() => {
  api.get.mockReset().mockRejectedValue({ response: { status: 401 } })
  api.post.mockReset().mockResolvedValue({})
  authenticate.mockReset()
})

function open(path = '/') {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>)
  return userEvent.setup()
}

test('protects the workspace and signs in through the form', async () => {
  authenticate.mockResolvedValue(user)
  const browser = open()
  await browser.type(await screen.findByLabelText(/^Email/), user.email)
  await browser.type(screen.getByLabelText(/^Password/), 'long-test-password')
  await browser.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('heading', { name: 'Welcome, Alex' })).toBeVisible()
  expect(authenticate).toHaveBeenCalledWith('login', { email: user.email, password: 'long-test-password' })
})

test('submits registration fields and shows server validation', async () => {
  authenticate.mockRejectedValue({ response: { status: 422, data: { errors: { email: ['This email is already registered.'] } } } })
  const browser = open('/register')
  await browser.type(await screen.findByLabelText(/^Name/), user.name)
  await browser.type(screen.getByLabelText(/^Email/), user.email)
  await browser.type(screen.getByLabelText(/^Password/), 'long-test-password')
  await browser.type(screen.getByLabelText(/^Confirm password/), 'long-test-password')
  await browser.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByText('This email is already registered.')).toBeVisible()
  expect(authenticate).toHaveBeenCalledWith('register', { name: user.name, email: user.email, password: 'long-test-password', password_confirmation: 'long-test-password' })
  expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true')
})

test('restores a session and signs out', async () => {
  api.get.mockResolvedValue({ data: user })
  const browser = open('/login')
  expect(await screen.findByRole('heading', { name: 'Welcome, Alex' })).toBeVisible()
  await browser.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible()
  expect(api.post).toHaveBeenCalledWith('/logout')
})

test('preserves the workspace and offers an error if logout fails', async () => {
  api.get.mockResolvedValue({ data: user })
  api.post.mockRejectedValue(new Error('Offline'))
  const browser = open()
  await browser.click(await screen.findByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible()
})

test('retries an unavailable session check instead of claiming the user is logged out', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: user })
  const browser = open()
  await browser.click(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'Welcome, Alex' })).toBeVisible()
})

test.each([419, 429])('shows a recoverable message for HTTP %s', async status => {
  authenticate.mockRejectedValue({ response: { status } })
  const browser = open('/login')
  await browser.type(await screen.findByLabelText(/^Email/), user.email)
  await browser.type(screen.getByLabelText(/^Password/), 'long-test-password')
  await browser.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(status === 419 ? 'session expired' : 'Too many attempts')
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
})

test('rejects an unexpected HTML response from a misconfigured API', async () => {
  api.get.mockResolvedValue({ data: '<html>Not the API</html>' })
  open()
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to check your session')
  expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
})
