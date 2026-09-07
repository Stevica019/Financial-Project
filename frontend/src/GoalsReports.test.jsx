import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import SavingsGoals from './pages/SavingsGoals'
import Reports from './pages/Reports'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { get: vi.fn(), put: vi.fn() } }))
vi.mock('./auth/useAuth', () => ({ useAuth: () => ({ user: { currency: 'EUR' } }) }))
beforeEach(() => vi.resetAllMocks())

test('goal corrections retain input on validation failure and refresh after retry', async () => {
  let goal = { id: 1, name: 'Trip', target_amount: '100.00', current_amount: '10.00', remaining: '90.00', percentage: 10, status: 'active' }
  api.get.mockImplementation(async () => ({ data: { data: [goal] } }))
  api.put.mockRejectedValueOnce({ response: { status: 422, data: { errors: { current_amount: ['Current amount cannot be negative.'] } } } })
    .mockImplementationOnce(async (_path, values) => { goal = { ...values, remaining: '0.00', percentage: 125 } })
  render(<SavingsGoals />)
  const article = await screen.findByRole('article', { name: 'Trip' })
  await userEvent.click(within(article).getByRole('button', { name: 'Edit' }))
  const saved = screen.getByLabelText(/^Saved amount/)
  fireEvent.change(saved, { target: { value: '-1' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save goal' }))
  expect(await screen.findByText('Current amount cannot be negative.')).toBeVisible()
  expect(saved).toHaveValue('-1')
  fireEvent.change(saved, { target: { value: '125.00' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save goal' }))
  expect(await screen.findByText(/125% reached/)).toBeVisible()
  expect(screen.getByRole('progressbar', { name: 'Trip goal progress' })).toHaveAttribute('aria-valuenow', '100')
})

test('reports hide stale results after a month change fails and allow retry', async () => {
  let fail = true
  const totals = { income: '0.00', expenses: '0.00', net_cash_flow: '0.00' }
  api.get.mockImplementation(async path => {
    if (path.includes('2026-02') && fail) throw new Error('Offline')
    return { data: { month: '2026-03', previous_month: '2026-02', currency: 'EUR', monthly: totals, previous: totals, change: totals, spending_by_category: [] } }
  })
  render(<Reports />)
  expect(await screen.findByText('No expenses recorded for this month.')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Report month'), { target: { value: '2026-02' } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.queryByRole('region', { name: 'Income' })).not.toBeInTheDocument()
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('region', { name: 'Income' })).toHaveTextContent('Change: EUR 0.00')
  expect(api.get).toHaveBeenLastCalledWith('/reports?month=2026-02', expect.anything())
})
