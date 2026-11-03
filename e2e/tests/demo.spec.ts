import { test, expect } from './fixtures'

test('a visitor can open the demo couple from the login page and see them sync', async ({ browser }) => {
  const anaPage = await (await browser.newContext()).newPage()
  await anaPage.goto('/login')
  await expect(anaPage.getByRole('heading', { name: 'Just looking around?' })).toBeVisible()
  await anaPage.getByRole('button', { name: 'Enter as Ana' }).click()
  await expect(anaPage).toHaveURL(/\/dashboard$/)
  await expect(anaPage.getByText('With Ben').locator('visible=true').first()).toBeVisible()

  // A second visitor in a separate window is Ben
  const benPage = await (await browser.newContext()).newPage()
  await benPage.goto('/login')
  await benPage.getByRole('button', { name: 'Enter as Ben' }).click()
  await expect(benPage).toHaveURL(/\/dashboard$/)

  const note = `Demo note ${Date.now()}`
  const anaCard = anaPage.locator('section[aria-label="Daily Connection"]')
  if (await anaCard.getByRole('button', { name: 'Mark as done' }).isVisible()) {
    await anaCard.getByLabel('Add a note for Ben (optional)').fill(note)
    await anaCard.getByRole('button', { name: 'Mark as done' }).click()
  } else {
    await anaCard.getByRole('button', { name: /Edit note|Add a note/ }).click()
    await anaCard.getByLabel('Your note').fill(note)
    await anaCard.getByRole('button', { name: 'Save note' }).click()
  }
  await expect(benPage.locator('section[aria-label="Daily Connection"]').getByText(note)).toBeVisible()

  await benPage.goto('/journal')
  await expect(benPage.getByText('Sunday market')).toBeVisible()
  await expect(benPage.locator('article')).toHaveCount(4)
})
