import { test, expect, registerUser, linkCouple, asUser } from './fixtures'

test('register in the UI, link with a code, and see the partner', async ({ page, request }) => {
  const kai = await registerUser(request, 'Kai')
  await page.goto('/register')
  await page.locator('#reg-name').fill('Rae')
  await page.locator('#reg-email').fill(`rae${Date.now()}@e2e.dev`)
  await page.locator('#reg-password').fill('secret123')
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/link-partner$/)

  await page.locator('#partner-code-input').fill(kai.coupleCode.toLowerCase())
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('With Kai').locator('visible=true').first()).toBeVisible()
})

test('sign out asks first, ends the server session, and Back stays out', async ({ page, request }) => {
  const sam = await registerUser(request, 'Sam')
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(sam.email)
  await page.locator('input[type="password"]').fill('secret123')
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/(dashboard|link-partner)$/)
  await page.goto('/dashboard')

  const menu = page.getByRole('button', { name: 'Open profile menu' }).locator('visible=true')
  const visibleButton = (name: string) => page.getByRole('button', { name, exact: true }).locator('visible=true')

  await menu.click()
  await visibleButton('Sign out').click()
  await expect(page.getByText('Sign out of TwinFlame on this device?')).toBeVisible()
  await expect(visibleButton('Cancel')).toBeFocused()
  await visibleButton('Cancel').click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await visibleButton('Sign out').click()
  await visibleButton('Sign out').click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
  expect(await page.evaluate(async () => (await fetch('/api/auth/me')).status)).toBe(401)
  await page.goBack()
  await expect(page).not.toHaveURL(/\/dashboard$/)
})

test('a stored malicious journal entry does not run in the browser', async ({ page, request }) => {
  const a = await registerUser(request, 'Xa'), b = await registerUser(request, 'Xb')
  await linkCouple(request, a, b)
  await asUser(request, a, (ctx, headers) => ctx.post('/api/journal', { headers, data: { title: 'Hello', content: '<b>kept</b><img src=x onerror="window.__xss=1">' } }), 201)
  await page.addInitScript(t => localStorage.setItem('token', t), b.token)
  let dialogs = 0
  page.on('dialog', d => { dialogs++; void d.dismiss() })
  await page.goto('/journal')
  await expect(page.getByText('Hello').first()).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss ?? null)).toBeNull()
  expect(await page.locator('[onerror]').count()).toBe(0)
  expect(dialogs).toBe(0)
})

test('an expired or revoked token sends you to login with a message', async ({ page }) => {
  // Set once: an init script would put the token back on every page load
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('token', 'expired.or.revoked'))
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?session=expired$/)
  await expect(page.getByText('Your session ended. Sign in again to continue.')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
})
