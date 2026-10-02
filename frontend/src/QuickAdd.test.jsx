import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api } from './api'
import { useRemote } from './useRemote'
import { useWorkspace } from './workspace'
import WorkspaceProvider from './WorkspaceProvider'
import QuickAdd from './components/QuickAdd'

vi.mock('./api', async importOriginal => ({ ...await importOriginal(), api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('./auth/useAuth', () => ({ useAuth: () => ({ user: { currency: 'EUR' } }) }))
beforeEach(() => { vi.resetAllMocks(); localStorage.clear() })

function Page() {
  const { openActivity } = useWorkspace()
  const summary = useRemote('/dashboard')
  return <>
    <button onClick={() => openActivity()}>Open quick add</button>
    <p>Balance {summary.data?.total ?? '…'}</p>
  </>
}

function serve(accounts) {
  let total = 1
  api.get.mockImplementation(async path => {
    if (path === '/accounts') return { data: { data: accounts } }
    if (path === '/categories') return { data: { data: [{ id: 10, name: 'Groceries', type: 'expense' }] } }
    if (path === '/settings') return { data: { today: '2026-03-31' } }
    return { data: { total: total++ } }
  })
  render(<MemoryRouter><WorkspaceProvider><Page /><QuickAdd /></WorkspaceProvider></MemoryRouter>)
  return userEvent.setup()
}

test('asks for an account before recording anything', async () => {
  const browser = serve([{ id: 1, name: 'Closed', is_active: false }])
  await browser.click(await screen.findByRole('button', { name: 'Open quick add' }))
  expect(await screen.findByRole('dialog', { name: 'Add an account first' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts')
})

test('saves from anywhere, confirms and refreshes visible data without a reload', async () => {
  api.post.mockResolvedValue({})
  const browser = serve([{ id: 1, name: 'Bank', is_active: true }])
  expect(await screen.findByText('Balance 1')).toBeVisible()
  await browser.click(screen.getByRole('button', { name: 'Open quick add' }))
  await screen.findByRole('dialog', { name: 'Add transaction' })
  expect(screen.getByLabelText(/^Account/)).toHaveValue('1')
  await browser.type(screen.getByLabelText(/^Amount/), '9.99')
  await browser.selectOptions(screen.getByLabelText(/^Category/), 'Groceries')
  await browser.type(screen.getByLabelText(/^Description/), 'Snacks{Enter}')
  expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({ account_id: 1, category_id: '10', amount: '9.99', description: 'Snacks' }))
  expect(await screen.findByText('Transaction saved')).toBeVisible()
  expect(screen.queryByRole('dialog', { name: 'Add transaction' })).not.toBeInTheDocument()
  expect(await screen.findByText('Balance 2')).toBeVisible()
})
