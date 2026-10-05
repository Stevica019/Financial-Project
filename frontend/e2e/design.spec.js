import { test, expect } from '@playwright/test'
import { navigateWorkspace } from './navigation'

test('workspace navigation supports keyboard access and both themes fit desktop and mobile', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/user', route => route.fulfill({ json: { id: 1, name: 'Alex', email: 'alex@example.com', currency: 'EUR', timezone: 'UTC' } }))
  await page.route('**/api/dashboard*', route => route.fulfill({ json: {
    month: '2026-09', currency: 'EUR', total_balance: '12840.50',
    monthly: { income: '4250.00', expenses: '1680.25', net_cash_flow: '2569.75' },
    accounts: [{ id: 1, name: 'Everyday account', balance: '3840.50', is_active: true }, { id: 2, name: 'Savings', balance: '9000.00', is_active: true }],
    budgets: [], goals: [],
    recent_activity: [{ id: 1, kind: 'transaction', type: 'expense', description: 'Weekly groceries', amount: '64.50', date: '2026-09-08', account_id: 1, account_name: 'Everyday account', category_name: 'Groceries' }],
  } }))
  await page.route('**/api/accounts', route => route.fulfill({ json: { data: [{ id: 1, name: 'Everyday account', is_active: true }] } }))
  await page.route('**/api/categories', route => route.fulfill({ json: { data: [] } }))
  await page.route('**/api/settings', route => route.fulfill({ json: { user: { currency: 'EUR', timezone: 'UTC' }, currencies: ['EUR'], timezones: ['UTC'] } }))
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Total balance', exact: true })).toContainText('€12,840.50')
  await expect(page.getByText('alex@example.com', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Appearance')).toHaveCount(0)
  await expect(page.getByText('Welcome, Alex')).toHaveCount(0)
  const userMenu = page.getByRole('button', { name: 'User menu' })
  await userMenu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toHaveAttribute('href', '/settings')
  await expect(page.getByRole('menu')).toContainText('alex@example.com')
  await page.keyboard.press('Escape')
  await expect(userMenu).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Goals', exact: true })).toHaveAttribute('href', '/goals')

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const mode of ['light', 'dark']) {
      await navigateWorkspace(page, 'Settings')
      await expect(page.getByRole('region', { name: 'Profile', exact: true })).toContainText('alex@example.com')
      await page.getByLabel('Appearance').selectOption(mode)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      if (width === 1440 || width === 390) await page.screenshot({ path: `/private/tmp/finance-settings-${width}-${mode}.png`, fullPage: true, animations: 'disabled' })
      await navigateWorkspace(page, 'Overview')
      await expect(page.locator('.app-shell')).toHaveClass(new RegExp(`\\btheme-${mode}\\b`))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      if (width === 1440 || width === 390) await page.screenshot({ path: `/private/tmp/finance-dashboard-${width}-${mode}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  const bottomBar = page.getByRole('navigation', { name: 'Workspace' })
  await expect(bottomBar.getByRole('link')).toHaveCount(6)
  expect(await bottomBar.evaluate(element => element.getBoundingClientRect().bottom)).toBe(1000)
  await userMenu.click()
  await expect(page.getByRole('menuitem')).toHaveCount(2)
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
  await expect(userMenu).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('.page-enter').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  expect(errors).toEqual([])
})

test('sign-in remains readable and usable across theme and viewport sizes', async ({ page }) => {
  await page.route('**/api/user', route => route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } }))
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const mode of ['light', 'dark']) {
      await page.evaluate(value => localStorage.setItem('finance-appearance', value), mode)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
      await expect(page.getByLabel('Appearance')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
      if (width === 1440 || width === 390) await page.screenshot({ path: `/private/tmp/finance-login-${width}-${mode}.png`, fullPage: true, animations: 'disabled' })
    }
  }
})
