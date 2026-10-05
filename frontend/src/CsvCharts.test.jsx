import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import CsvImport from './pages/CsvImport'
import CsvExport from './components/CsvExport'
import ReportCharts from './components/ReportCharts'
import Appearance from './Appearance'
import AppearanceControl from './components/AppearanceControl'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('./auth/useAuth', () => ({ useAuth: () => ({ user: { currency: 'EUR' } }) }))
beforeEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); localStorage.clear() })

test('CSV errors preserve the file for retry and importing requires a preview and confirmation', async () => {
  api.get.mockResolvedValue({ data: { data: [] } })
  api.post.mockRejectedValueOnce({ response: { status: 422, data: { errors: { 'row_2.amount': ['Invalid amount.'] } } } })
    .mockResolvedValueOnce({ data: { token: 'preview-token', total: 1, duplicates: 0, rows: [{ type: 'expense', date: '2024-01-01', amount: '1.00', currency: 'EUR', account_id: '1', category_id: '2', description: 'Food' }] } })
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: { imported: 1, skipped: 0 } })
  render(<MemoryRouter><CsvImport /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument()
  await userEvent.upload(screen.getByLabelText('CSV file'), new File(['csv'], 'activity.csv', { type: 'text/csv' }))
  await userEvent.click(screen.getByRole('button', { name: 'Preview import' }))
  expect(await screen.findByText('row_2.amount: Invalid amount.')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Preview import' }))
  expect(await screen.findByRole('region', { name: 'Import preview' })).toHaveTextContent('Food')
  expect(api.post).toHaveBeenCalledTimes(2)
  await userEvent.click(screen.getByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByText('Unable to connect right now. Please try again.')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByText(/Imported 1 records; skipped 0/)).toBeVisible()
  expect(api.post).toHaveBeenLastCalledWith('/activity/import', { token: 'preview-token' }, expect.anything())
  expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument()
})

test('export retains filters, omits pagination and allows retry without downloading errors', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: new Blob(['csv']), headers: { 'content-type': 'text/csv' } })
  const create = vi.fn(() => 'blob:test')
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<CsvExport scope="transactions" filters={{ search: 'Food', page: 2, per_page: 1 }} />)
  await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(create).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  expect(api.get).toHaveBeenLastCalledWith('/activity/export?search=Food&scope=transactions', expect.objectContaining({ responseType: 'blob' }))
  expect(click).toHaveBeenCalledOnce()
  vi.unstubAllGlobals()
})

test('chart supports keyboard selection, metric and period changes, and exact accessible values', async () => {
  const trend = Array.from({ length: 12 }, (_, index) => ({ month: `2024-${String(index + 1).padStart(2, '0')}`, income: '0.00', expenses: '1.23', net_cash_flow: '-1.23' }))
  render(<ReportCharts data={{ month: '2024-12', currency: 'EUR', trend, monthly: { expenses: '1.23' }, spending_by_category: [{ category_id: 1, name: 'Food', amount: '1.23' }] }} />)
  const bar = screen.getByRole('button', { name: '2024-12: Net cash flow -€1.23' })
  bar.focus(); await userEvent.keyboard('{Enter}')
  expect(screen.getByRole('status')).toHaveTextContent('2024-12: Net cash flow -€1.23')
  await userEvent.selectOptions(screen.getByLabelText('Chart metric'), 'expenses')
  expect(screen.getByRole('status')).toHaveTextContent('Expenses €1.23')
  await userEvent.selectOptions(screen.getByLabelText('Chart period'), '6')
  expect(screen.getAllByRole('button')).toHaveLength(6)
  await userEvent.click(screen.getByText('View chart data'))
  expect(within(screen.getByRole('region', { name: 'Monthly chart data' })).getAllByRole('row')).toHaveLength(7)
  expect(screen.getByText('Food · €1.23 · 100.0%')).toBeVisible()
})

test('appearance selection persists across remounts', async () => {
  const { unmount } = render(<MemoryRouter><Appearance><AppearanceControl /></Appearance></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Appearance'), { target: { value: 'dark' } })
  expect(localStorage.getItem('finance-appearance')).toBe('dark')
  unmount()
  render(<MemoryRouter><Appearance><AppearanceControl /></Appearance></MemoryRouter>)
  expect(screen.getByLabelText('Appearance')).toHaveValue('dark')
})
