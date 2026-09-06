import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api } from './api'
import Overview from './pages/Overview'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { get: vi.fn() } }))
const summary = { month: '2026-09', currency: 'EUR', total_balance: '10.01', monthly: { income: '0.10', expenses: '0.20', net_cash_flow: '-0.10' }, accounts: [], recent_activity: [] }
beforeEach(() => api.get.mockReset())

test('recovers from an unavailable dashboard and displays empty states with exact amounts', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: summary })
  render(<MemoryRouter><Overview /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.queryByRole('region', { name: 'Total balance' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('region', { name: 'Total balance' })).toHaveTextContent('EUR 10.01')
  expect(screen.getByRole('region', { name: 'Net cash flow' })).toHaveTextContent('EUR -0.10')
  expect(screen.getByText(/No accounts yet/)).toBeVisible()
  expect(screen.getByText(/No activity yet/)).toBeVisible()
})

test('month changes request new summaries and hide stale amounts while loading', async () => {
  let resolveMonth
  api.get.mockResolvedValueOnce({ data: summary }).mockImplementationOnce(() => new Promise(resolve => { resolveMonth = resolve }))
  render(<MemoryRouter><Overview /></MemoryRouter>)
  await screen.findByRole('region', { name: 'Monthly income' })
  fireEvent.change(screen.getByLabelText('Summary month'), { target: { value: '2026-08' } })
  expect(api.get).toHaveBeenLastCalledWith('/dashboard?month=2026-08', expect.anything())
  expect(screen.queryByRole('region', { name: 'Monthly income' })).not.toBeInTheDocument()
  resolveMonth({ data: { ...summary, month: '2026-08', monthly: { income: '7.00', expenses: '0.00', net_cash_flow: '7.00' } } })
  expect(await screen.findByRole('region', { name: 'Monthly income' })).toHaveTextContent('EUR 7.00')
  expect(screen.getByRole('region', { name: 'Total balance' })).toHaveTextContent('EUR 10.01')
})
