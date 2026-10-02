import { navigateWorkspace } from './navigation'
import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('CSV preview, validation, import, filtered downloads, charts and appearance work on mobile', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel(/^Name/).fill('CSV User')
  await page.getByLabel(/^Email/).fill(`csv-${Date.now()}@example.com`)
  await page.getByLabel(/^Password/).fill('a-long-browser-test-password')
  await page.getByLabel(/^Confirm password/).fill('a-long-browser-test-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Appearance').selectOption('dark')
  await page.getByLabel(/^Currency/).selectOption('EUR')
  await page.getByLabel(/^Timezone/).selectOption('UTC')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByText('Preferences saved.')).toBeVisible()
  const ids = await page.evaluate(async () => {
    const csrf = decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN=')).split('=')[1])
    async function write(path, values) {
      const response = await fetch(`/api/${path}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf }, body: JSON.stringify(values) })
      if (!response.ok) throw new Error(await response.text())
      return (await response.json()).data.id
    }
    return {
      account: await write('accounts', { name: 'Bank', type: 'checking', opening_balance: '100.00', opening_date: '2024-01-01' }),
      second: await write('accounts', { name: 'Cash', type: 'cash', opening_balance: '0.00', opening_date: '2024-01-01' }),
      category: await write('categories', { name: 'CSV food', type: 'expense' }),
    }
  })
  await navigateWorkspace(page, 'CSV import')
  const downloadTemplate = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSV template' }).click()
  const template = await readFile(await (await downloadTemplate).path(), 'utf8')
  const csv = `${template}expense,2024-02-29,10.01,EUR,${ids.account},${ids.category},,,CSV lunch,,,,,\r\ntransfer,2024-02-29,2.03,EUR,,,${ids.account},${ids.second},Cash move,,,,,\r\n`
  await page.getByLabel('CSV file').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.replace('10.01', '10.001')) })
  await page.getByRole('button', { name: 'Preview import' }).click()
  await expect(page.getByRole('alert')).toContainText('row_2.amount')
  await expect(page.getByRole('button', { name: 'Confirm import' })).toHaveCount(0)
  await page.getByLabel('CSV file').setInputFiles({ name: 'activity.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Preview import' }).click()
  await expect(page.getByRole('region', { name: 'Import preview' })).toContainText('CSV lunch')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.getByRole('alert')).toContainText('Imported 2 records; skipped 0')
  await page.getByRole('button', { name: 'Preview import' }).click()
  await expect(page.getByText(/This file was already imported/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.getByRole('alert')).toContainText('Imported 0 records; skipped 2')
  await navigateWorkspace(page, 'Overview')
  await expect(page.getByRole('region', { name: 'Total balance', exact: true })).toContainText('€89.99')
  await navigateWorkspace(page, 'Transactions')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const exported = await readFile(await (await download).path(), 'utf8')
  expect(exported).toContain('CSV lunch')
  expect(exported).not.toContain('Cash move')
  await navigateWorkspace(page, 'Reports')
  await page.getByLabel('Report month').fill('2024-03')
  const bar = page.getByRole('button', { name: '2024-02: Net cash flow -€10.01' })
  await bar.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Cash flow trend', exact: true }).getByRole('status')).toContainText('2024-02: Net cash flow -€10.01')
  await page.getByLabel('Chart metric').selectOption('expenses')
  await page.getByLabel('Chart period').selectOption('6')
  await page.getByText('View chart data', { exact: true }).click()
  await expect(page.getByRole('region', { name: 'Monthly chart data' })).toContainText('10.01')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.screenshot({ path: 'test-results/reports-dark-mobile.png', fullPage: true })
  await page.reload()
  await navigateWorkspace(page, 'Settings')
  await expect(page.getByLabel('Appearance')).toHaveValue('dark')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
  await page.getByLabel('Appearance').selectOption('light')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByLabel('Appearance').selectOption('system')
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
  expect(errors).toEqual([])
})
