import { test, expect } from '@playwright/test'

test('registers, restores the session, logs out, and logs in again', async ({ page, context }) => {
  const email = `browser-${Date.now()}@example.com`
  const password = 'a-long-browser-test-password'
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.getByLabel(/^Name/).fill('Browser User')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByLabel(/^Confirm password/).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Browser User' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome, Browser User' })).toBeVisible()
  const cookies = await context.cookies()
  expect(cookies.some(cookie => cookie.name.endsWith('session') && cookie.httpOnly)).toBeTruthy()
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByLabel(/^Email/).fill(email.toUpperCase())
  await page.getByLabel(/^Password/).fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('The email or password is incorrect.')).toBeVisible()
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Browser User' })).toBeVisible()
})

test('rejects writes without a CSRF token, even after fetching the CSRF cookie', async ({ request }) => {
  await request.get('/sanctum/csrf-cookie')
  for (const route of ['register', 'login', 'logout']) {
    const response = await request.post(`/api/${route}`, { data: {}, headers: { Accept: 'application/json' } })
    expect(response.status()).toBe(419)
  }
})
