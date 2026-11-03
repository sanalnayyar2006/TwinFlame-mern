import { test, expect, registerUser, linkCouple, signedInPage } from './fixtures'

test('is installable: manifest, icons, and a service worker', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'TwinFlame', display: 'standalone', start_url: '/dashboard' })
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200)
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)

  await page.goto('/login')
  await expect(page).toHaveTitle('TwinFlame')
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toMatch(/\/$/)
})

test('opens offline from the cached app shell, and never caches private data', async ({ browser, request }) => {
  const ana = await registerUser(request, 'Off')
  const page = await signedInPage(browser, ana)
  await page.goto('/dashboard')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  // The first load installs the worker; reload once so it controls the page and caches assets
  await page.reload()
  await expect(page.locator('section[aria-label="Daily Connection"]')).toBeVisible()

  await page.context().setOffline(true)
  await page.reload()
  // Shell renders from cache; the data card shows its offline message instead of stale data
  await expect(page.getByText(/Couldn't reach TwinFlame|didn't load/).first()).toBeVisible()
  const cachedApi = await page.evaluate(async () => {
    const urls: string[] = []
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(req.url)
    return urls.filter(u => u.includes('/api/'))
  })
  expect(cachedApi).toEqual([])
  await page.context().setOffline(false)
})

test('offers partner-answered notifications while waiting', async ({ browser, request }) => {
  const a = await registerUser(request, 'Pa'), b = await registerUser(request, 'Pb')
  await linkCouple(request, a, b)
  const page = await signedInPage(browser, a)
  await page.goto('/dashboard')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Notify me when Pb answers' })).toBeVisible()
})
