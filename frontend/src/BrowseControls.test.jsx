import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import ResourceManager from './components/ResourceManager'
import { browseFields } from './components/activityFields'

vi.mock('./api', async importOriginal => ({
  ...await importOriginal(),
  api: { get: vi.fn() },
}))

const entry = { id: 1, kind: 'transaction', type: 'expense', description: 'Lunch', amount: '12.50', date: '2026-10-01' }
const paths = () => api.get.mock.calls.map(([path]) => path)
const lastList = () => paths().filter(path => path.startsWith('/activity?')).at(-1)

beforeEach(() => {
  api.get.mockReset().mockImplementation(path => Promise.resolve(path.startsWith('/activity/export')
    ? { data: new Blob(['csv']), headers: { 'content-type': 'text/plain' } }
    : { data: { data: [entry], meta: { total: 1, current_page: 1, last_page: 1 } } }))
})

function open() {
  render(<ResourceManager title="Activity" noun="transaction" endpoint="/activity" layout="rows"
    browseFields={browseFields([{ id: 7, name: 'Bank' }], [{ id: 3, name: 'Food', type: 'expense' }], { currency: 'EUR', today: '2026-10-05' })}
    row={record => <button type="button">{record.description}</button>} groupBy={record => record.date} />)
  return userEvent.setup()
}

test('search applies after a pause, filters show as removable chips and clear at once', async () => {
  const browser = open()
  expect(await screen.findByRole('button', { name: 'Lunch' })).toBeVisible()
  await browser.type(screen.getByLabelText('Search description or notes'), 'lu')
  expect(lastList()).toBe('/activity?page=1')
  await waitFor(() => expect(lastList()).toBe('/activity?search=lu&page=1'))
  expect(paths()).not.toContain('/activity?search=l&page=1')

  const filters = screen.getByRole('button', { name: 'Filters' })
  await browser.click(filters)
  expect(filters).toHaveAttribute('aria-expanded', 'true')
  await browser.selectOptions(screen.getByLabelText('Type'), 'expense')
  await browser.type(screen.getByLabelText('Minimum amount'), '5')
  await waitFor(() => expect(lastList()).toBe('/activity?search=lu&type=expense&amount_min=5&page=1'))
  const chips = screen.getByRole('group', { name: 'Active filters' })
  expect(screen.getByRole('button', { name: 'Filters · 2' })).toBeVisible()
  expect(within(chips).getByRole('button', { name: 'Remove filter: Min €5.00' })).toBeVisible()

  await browser.click(within(chips).getByRole('button', { name: 'Remove filter: Expense' }))
  await waitFor(() => expect(lastList()).toBe('/activity?search=lu&amount_min=5&page=1'))
  expect(screen.getByLabelText('Type')).toHaveValue('')
  await browser.click(within(chips).getByRole('button', { name: 'Clear all' }))
  await waitFor(() => expect(lastList()).toBe('/activity?page=1'))
  expect(screen.getByLabelText('Search description or notes')).toHaveValue('')
  expect(screen.queryByRole('group', { name: 'Active filters' })).not.toBeInTheDocument()
  // Earlier results stay on screen while new ones load.
  expect(screen.getByRole('button', { name: 'Lunch' })).toBeVisible()
})

test('column headers sort and reverse, and export keeps filters and sort', async () => {
  const browser = open()
  const sortBy = await screen.findByRole('group', { name: 'Sort by' })
  expect(within(sortBy).getByRole('button', { name: 'Date, sorted descending' })).toBeVisible()
  await browser.click(within(sortBy).getByRole('button', { name: 'Amount' }))
  await waitFor(() => expect(lastList()).toBe('/activity?sort=amount&direction=desc&page=1'))
  await browser.click(within(sortBy).getByRole('button', { name: 'Amount, sorted descending' }))
  await waitFor(() => expect(lastList()).toBe('/activity?sort=amount&direction=asc&page=1'))
  await browser.click(within(sortBy).getByRole('button', { name: 'Description' }))
  await waitFor(() => expect(lastList()).toBe('/activity?sort=description&direction=asc&page=1'))

  await browser.click(screen.getByRole('button', { name: 'More actions' }))
  await browser.click(screen.getByRole('menuitem', { name: 'Export CSV' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable')
  expect(paths()).toContain('/activity/export?sort=description&direction=asc&scope=history')
})
