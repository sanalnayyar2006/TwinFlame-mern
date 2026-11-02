import { test, expect, registerUser, linkCouple, signedInPage, pageErrors } from './fixtures'

// Each partner gets their own browser context, like two phones
const deviceOptions = () => {
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = test.info().project.use
  return { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor }
}

test('partners see each other live: linking, daily connection, edits, mood @mobile', async ({ browser, request }) => {
  const ana = await registerUser(request, 'Ana')
  const ben = await registerUser(request, 'Ben')

  const benPage = await signedInPage(browser, ben, deviceOptions())
  await benPage.goto('/dashboard')
  const benCard = benPage.locator('section[aria-label="Daily Connection"]')
  await expect(benCard.getByRole('link', { name: 'Link your partner' })).toBeVisible()

  // Ana links while Ben's dashboard is already open: no reload needed
  await linkCouple(request, ana, ben)
  await expect(benCard.getByText('Waiting for Ana')).toBeVisible()

  const anaPage = await signedInPage(browser, ana, deviceOptions())
  await anaPage.goto('/dashboard')
  const anaCard = anaPage.locator('section[aria-label="Daily Connection"]')
  await expect(anaCard.getByText('Waiting for Ben')).toBeVisible()
  await expect(anaCard.locator('p').first()).toHaveText(await benCard.locator('p').first().innerText())

  // Ana answers with a note; it appears on Ben's screen
  await anaCard.getByLabel('Add a note for Ben (optional)').fill('Your laugh at breakfast')
  await anaCard.getByRole('button', { name: 'Mark as done' }).click()
  await expect(anaCard.getByText('Done today')).toBeVisible()
  await expect(benCard.getByText('Your laugh at breakfast')).toBeVisible()

  // Ana edits; Ben sees the new text and the edited marker
  await anaCard.getByRole('button', { name: 'Edit note' }).click()
  await anaCard.getByLabel('Your note').fill('Your laugh, and the coffee')
  await anaCard.getByRole('button', { name: 'Save note' }).click()
  await expect(benCard.getByText('Your laugh, and the coffee')).toBeVisible()
  await expect(benCard.getByText(/edited/)).toBeVisible()

  // Ben completes without a note; Ana sees it
  await benCard.getByRole('button', { name: 'Mark as done' }).click()
  await expect(anaCard.getByText('Marked as done, no note.')).toBeVisible()

  // Mood sync
  await anaPage.getByRole('button', { name: 'Happy' }).click()
  await expect(benPage.getByText('Ana is feeling')).toBeVisible()

  // Survives a reload
  await benPage.reload()
  await expect(benPage.locator('section[aria-label="Daily Connection"]').getByText('Your laugh, and the coffee')).toBeVisible()

  expect(pageErrors(anaPage)).toEqual([])
  expect(pageErrors(benPage)).toEqual([])
})
