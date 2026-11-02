import fs from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'

// Real screenshots of the running app for the README. Not part of the normal run:
//   pnpm --filter e2e screenshots
const OUT = path.resolve(__dirname, '../../.github/assets')
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

const enterDemo = async (page: Page, as: 'Ana' | 'Ben') => {
  await page.goto('/login')
  await page.getByRole('button', { name: `Enter as ${as}` }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('README screenshots @screenshots', async ({ browser }) => {
  fs.mkdirSync(OUT, { recursive: true })

  const login = await (await browser.newContext(phone)).newPage()
  await login.goto('/login')
  await expect(login.getByRole('heading', { name: 'Just looking around?' })).toBeVisible()
  await login.screenshot({ path: `${OUT}/login.png`, fullPage: true })

  const ana = await (await browser.newContext(phone)).newPage()
  const ben = await (await browser.newContext(phone)).newPage()
  await enterDemo(ana, 'Ana')
  await enterDemo(ben, 'Ben')
  const anaCard = ana.locator('section[aria-label="Daily Connection"]')
  const benCard = ben.locator('section[aria-label="Daily Connection"]')
  await expect(benCard.getByText('Waiting for Ana')).toBeVisible()
  await anaCard.getByLabel('Add a note for Ben (optional)').fill('You made tea on Wednesday without me asking.')
  await anaCard.getByRole('button', { name: 'Mark as done' }).click()
  await expect(benCard.getByText('You made tea on Wednesday')).toBeVisible()

  // Side by side: Ana answers on one phone, it appears on Ben's
  const [a, b] = await Promise.all([ana.screenshot(), ben.screenshot()])
  const frame = await (await browser.newContext({ viewport: { width: 860, height: 900 }, deviceScaleFactor: 2 })).newPage()
  const img = (buf: Buffer, label: string) =>
    `<figure><img src="data:image/png;base64,${buf.toString('base64')}"><figcaption>${label}</figcaption></figure>`
  await frame.setContent(`<!doctype html><style>
    body{margin:0;background:#130d12;display:flex;gap:24px;justify-content:center;align-items:flex-start;padding:24px;font:500 15px system-ui;color:#b0a1ac}
    figure{margin:0;text-align:center} img{width:390px;border-radius:24px;border:1px solid rgba(255,255,255,.12)} figcaption{margin-top:12px}
  </style>${img(a, 'Ana answers on her phone')}${img(b, 'It appears on Ben’s, live')}`)
  await frame.screenshot({ path: `${OUT}/live-sync.png`, fullPage: true })

  await benCard.getByRole('button', { name: 'Mark as done' }).click()
  const desk = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage()
  await enterDemo(desk, 'Ana')
  await expect(desk.locator('section[aria-label="Daily Connection"]').getByText('Marked as done, no note.')).toBeVisible()
  await desk.screenshot({ path: `${OUT}/dashboard.png` })
  await desk.goto('/journal')
  await expect(desk.getByText('Sunday market')).toBeVisible()
  await desk.screenshot({ path: `${OUT}/journal.png` })
})
