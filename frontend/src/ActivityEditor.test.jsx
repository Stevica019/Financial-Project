import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import ActivityEditor from './components/ActivityEditor'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { post: vi.fn(), put: vi.fn() } }))

const accounts = [
  { id: 1, name: 'Bank', is_active: true },
  { id: 2, name: 'Cash', is_active: true },
  { id: 3, name: 'Old card', is_active: false },
]
const categories = [{ id: 10, name: 'Groceries', type: 'expense' }, { id: 11, name: 'Salary', type: 'income' }]

beforeEach(() => { vi.resetAllMocks(); localStorage.clear() })

function open(props = {}) {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn(), onDelete: vi.fn() }
  render(<ActivityEditor accounts={accounts} categories={categories} today="2026-03-31" currency="EUR" {...handlers} {...props} />)
  return { ...handlers, browser: userEvent.setup() }
}

test('records an expense with the amount focused first and remembers the account for next time', async () => {
  api.post.mockResolvedValue({})
  const { browser, onSaved } = open()
  expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  await waitFor(() => expect(screen.getByLabelText(/^Amount/)).toHaveFocus())
  expect(screen.getByLabelText(/^Date/)).toHaveValue('2026-03-31')
  await browser.type(screen.getByLabelText(/^Amount/), '12.50')
  await browser.selectOptions(screen.getByLabelText(/^Category/), 'Groceries')
  await browser.selectOptions(screen.getByLabelText(/^Account/), 'Cash')
  await browser.type(screen.getByLabelText(/^Description/), 'Market')
  await browser.click(screen.getByRole('button', { name: 'Save transaction' }))
  expect(api.post).toHaveBeenCalledWith('/transactions', { type: 'expense', account_id: '2', category_id: '10', amount: '12.50', date: '2026-03-31', description: 'Market', notes: '' })
  expect(onSaved).toHaveBeenCalledWith('expense')
  expect(localStorage.getItem('finance-last-account')).toBe('2')
})

test('defaults to the remembered account, resets the category when the type changes and switches to a transfer', async () => {
  localStorage.setItem('finance-last-account', '2')
  api.post.mockResolvedValue({})
  const { browser } = open()
  expect(screen.getByLabelText(/^Account/)).toHaveValue('2')
  expect(screen.queryByRole('option', { name: 'Old card (archived)' })).not.toBeInTheDocument()
  await browser.selectOptions(screen.getByLabelText(/^Category/), 'Groceries')
  await browser.click(screen.getByRole('button', { name: 'Income' }))
  expect(screen.getByLabelText(/^Category/)).toHaveValue('')
  expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument()
  await browser.click(screen.getByRole('button', { name: 'Transfer' }))
  expect(screen.getByRole('dialog', { name: 'Add transfer' })).toBeVisible()
  expect(screen.getByLabelText(/^From account/)).toHaveValue('2')
  expect(screen.queryByLabelText(/^Category/)).not.toBeInTheDocument()
  await browser.selectOptions(screen.getByLabelText(/^To account/), 'Bank')
  await browser.type(screen.getByLabelText(/^Amount/), '5')
  await browser.click(screen.getByRole('button', { name: 'Save transfer' }))
  expect(api.post).toHaveBeenCalledWith('/transfers', { source_account_id: '2', destination_account_id: '1', amount: '5', date: '2026-03-31', description: '' })
})

test('edits keep their kind, show server validation and offer deletion', async () => {
  api.put.mockRejectedValueOnce({ response: { status: 422, data: { errors: { amount: ['Amount must be greater than zero.'] } } } }).mockResolvedValueOnce({})
  const record = { id: 7, kind: 'transaction', type: 'expense', amount: '3.00', date: '2026-03-01', description: 'Coffee', notes: null, account_id: 3, category_id: 10 }
  const { browser, onDelete, onSaved } = open({ record })
  expect(screen.getByRole('dialog', { name: 'Edit transaction' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Transfer' })).toBeDisabled()
  expect(screen.getByLabelText(/^Account/)).toHaveValue('3')
  await browser.clear(screen.getByLabelText(/^Amount/))
  await browser.type(screen.getByLabelText(/^Amount/), '0')
  await browser.click(screen.getByRole('button', { name: 'Save transaction' }))
  expect(await screen.findByText('Amount must be greater than zero.')).toBeVisible()
  expect(onSaved).not.toHaveBeenCalled()
  await browser.clear(screen.getByLabelText(/^Amount/))
  await browser.type(screen.getByLabelText(/^Amount/), '4.00')
  await browser.click(screen.getByRole('button', { name: 'Save transaction' }))
  expect(api.put).toHaveBeenLastCalledWith('/transactions/7', expect.objectContaining({ amount: '4.00', account_id: 3, notes: '' }))
  expect(onSaved).toHaveBeenCalledWith('expense')
  await browser.click(screen.getByRole('button', { name: 'Delete' }))
  expect(onDelete).toHaveBeenCalled()
})
