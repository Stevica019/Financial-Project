import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import Budgets from './pages/Budgets'
import RecurringRules from './pages/RecurringRules'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { get: vi.fn(), patch: vi.fn() } }))
vi.mock('./auth/useAuth', () => ({ useAuth: () => ({ user: { currency: 'EUR' } }) }))
beforeEach(() => vi.resetAllMocks())

test('budget month changes hide stale progress and failed loads can be retried', async () => {
  let fail = true
  api.get.mockImplementation(async path => {
    if (path === '/settings') return { data: { today: '2026-03-31' } }
    if (path === '/categories') return { data: { data: [] } }
    if (path.includes('2026-02') && fail) throw new Error('Offline')
    return { data: { data: [{ id: 1, name: 'Food', amount: '10.00', spent: '12.01', remaining: '-2.01', percentage: 120.1 }] } }
  })
  render(<Budgets />)
  expect(await screen.findByText(/Remaining: -€2.01/)).toBeVisible()
  expect(screen.getByRole('progressbar', { name: 'Food budget usage' })).toHaveAttribute('aria-valuenow', '100')
  fireEvent.change(screen.getByLabelText('Budget month'), { target: { value: '2026-02' } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.queryByText(/Remaining:/)).not.toBeInTheDocument()
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText(/Remaining: -€2.01/)).toBeVisible()
})

test('failed pause keeps the active rule visible and a retry updates its status', async () => {
  let active = true
  api.get.mockImplementation(async path => {
    if (path === '/settings') return { data: { today: '2026-03-31' } }
    if (path === '/accounts' || path === '/categories') return { data: { data: [] } }
    return { data: { data: [{ id: 1, description: 'Rent', type: 'expense', amount: '50.00', frequency: 'monthly', start_date: '2026-01-01', next_execution_date: '2026-04-01', is_active: active }] } }
  })
  api.patch.mockRejectedValueOnce({ response: { status: 422, data: { errors: { account_id: ['Choose an active account to run this rule.'] } } } }).mockImplementationOnce(async () => { active = false })
  render(<RecurringRules />)
  const rule = await screen.findByRole('article', { name: 'Rent' })
  await userEvent.click(within(rule).getByRole('button', { name: 'Pause' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose an active account to run this rule.')
  expect(rule).toHaveTextContent('Next due: Apr 1, 2026')
  await userEvent.click(within(rule).getByRole('button', { name: 'Pause' }))
  expect(await screen.findByRole('button', { name: 'Resume' })).toBeVisible()
  expect(api.patch).toHaveBeenLastCalledWith('/recurring-rules/1', { is_active: false })
})
