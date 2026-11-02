import { test as base, expect, request as playwrightRequest, type APIRequestContext, type Browser, type Page } from '@playwright/test'

export interface TestUser { token: string; name: string; email: string; coupleCode: string }

let n = 0
// Each API call gets a fresh context: a shared one would keep the last user's login cookie,
// and the server reads that cookie before the Authorization header
// (the request argument is kept so call sites read naturally inside a test)
const fresh = (_request: APIRequestContext) =>
  playwrightRequest.newContext({ baseURL: base.info().project.use.baseURL })

export async function registerUser(request: APIRequestContext, name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}${Date.now()}${++n}@e2e.dev`
  const ctx = await fresh(request)
  const res = await ctx.post('/api/auth/register', { data: { name, email, password: 'secret123' } })
  expect(res.status(), await res.text()).toBe(201)
  const body = await res.json()
  await ctx.dispose()
  return { token: body.token, name, email, coupleCode: body.user.coupleCode }
}

export async function linkCouple(request: APIRequestContext, a: TestUser, b: TestUser) {
  await asUser(request, a, (ctx, headers) => ctx.post('/api/auth/link-partner', { headers, data: { partnerCode: b.coupleCode } }), 200)
}

// Run one API call as a user, with no leftover cookies
export async function asUser(
  request: APIRequestContext,
  user: TestUser,
  call: (ctx: APIRequestContext, headers: Record<string, string>) => ReturnType<APIRequestContext['post']>,
  expectStatus?: number
) {
  const ctx = await fresh(request)
  const res = await call(ctx, { Authorization: `Bearer ${user.token}` })
  if (expectStatus) expect(res.status(), await res.text()).toBe(expectStatus)
  await ctx.dispose()
  return res
}

// A separate browser context per partner, already signed in
export async function signedInPage(browser: Browser, user: TestUser, contextOptions = {}): Promise<Page> {
  const context = await browser.newContext(contextOptions)
  await context.addInitScript(token => localStorage.setItem('token', token), user.token)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  ;(page as Page & { pageErrors: string[] }).pageErrors = errors
  return page
}

export const pageErrors = (page: Page) => (page as Page & { pageErrors?: string[] }).pageErrors ?? []

export const test = base
export { expect }
