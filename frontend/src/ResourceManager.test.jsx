import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { api } from './api'
import Categories from './pages/Categories'

vi.mock('./api', async importOriginal => ({
  ...await importOriginal(),
  api: { get: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  api.get.mockReset()
  api.delete.mockReset()
})

test('retries a failed category list without showing an empty success state', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: { data: [{ id: 1, name: 'Salary', type: 'income' }] } })
  render(<MemoryRouter><Categories /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.queryByText(/No categories yet/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('article', { name: 'Salary' })).toBeVisible()
})

test('keeps the record and confirmation available when deletion fails', async () => {
  api.get.mockResolvedValue({ data: { data: [{ id: 1, name: 'Salary', type: 'income' }] } })
  api.delete.mockRejectedValue(new Error('Offline'))
  const browser = userEvent.setup()
  render(<MemoryRouter><Categories /></MemoryRouter>)
  const record = await screen.findByRole('article', { name: 'Salary' })
  await browser.click(within(record).getByRole('button', { name: 'Delete', exact: true }))
  await browser.click(screen.getByRole('button', { name: 'Delete category', exact: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect')
  expect(screen.getByRole('dialog')).toBeVisible()
  await browser.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(await screen.findByRole('article', { name: 'Salary' })).toBeVisible()
})
