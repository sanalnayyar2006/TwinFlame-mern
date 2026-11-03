import AxeBuilder from '@axe-core/playwright'
import { test, expect, registerUser, linkCouple, signedInPage, asUser } from './fixtures'

// WCAG 2.x A and AA checks (contrast, labels, roles) on every screen, desktop and mobile
const scan = async (page: import('@playwright/test').Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Google's sign-in button is a cross-origin iframe we don't control
    .exclude('iframe[src*="accounts.google.com"]')
    .analyze()
  return violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}${v.nodes.length > 3 ? ` +${v.nodes.length - 3} more` : ''}`)
}

test('public screens meet WCAG AA @mobile', async ({ page }) => {
  for (const path of ['/login', '/register']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect.soft(await scan(page), path).toEqual([])
  }
})

test('signed-in screens meet WCAG AA @mobile', async ({ browser, request }) => {
  // Scans 12 screens and states; each axe run takes a couple of seconds
  test.setTimeout(120_000)
  const a = await registerUser(request, 'Axe'), b = await registerUser(request, 'Bee')
  const solo = await signedInPage(browser, a, test.info().project.use)
  await solo.goto('/link-partner')
  await solo.waitForLoadState('networkidle')
  expect(await scan(solo), '/link-partner').toEqual([])

  await linkCouple(request, a, b)
  await asUser(request, a, (ctx, headers) => ctx.post('/api/journal', { headers, data: { title: 'Walk', content: '<p>Sunny</p>' } }), 201)
  await asUser(request, b, (ctx, headers) => ctx.post('/api/daily-connection', { headers, data: { note: 'Hi', tz: 'UTC' } }), 200)
  const page = await signedInPage(browser, a, test.info().project.use)
  for (const path of ['/dashboard', '/journal', '/gallery', '/truth-dare']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect.soft(await scan(page), path).toEqual([])
  }
  // Interactive states: menus, editors, and dialogs
  const states: [string, string, () => Promise<unknown>][] = [
    ['/dashboard', 'profile menu open', () => page.getByRole('button', { name: /open profile menu/i }).locator('visible=true').click()],
    ['/dashboard', 'custom mood dialog', () => page.getByRole('button', { name: 'Add custom mood' }).click()],
    ['/dashboard', 'daily connection answered', async () => {
      const card = page.locator('section[aria-label="Daily Connection"]')
      await card.getByRole('button', { name: 'Mark as done' }).click()
      await card.getByText('Done today').waitFor()
    }],
    ['/journal', 'writing an entry', () => page.getByRole('button', { name: 'Write Entry' }).click()],
    ['/gallery', 'upload dialog', () => page.getByRole('button', { name: 'Add Photo' }).locator('visible=true').first().click()]
  ]
  for (const [path, label, open] of states) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await open()
    await page.waitForTimeout(300)
    expect.soft(await scan(page), `${path}: ${label}`).toEqual([])
  }
})
