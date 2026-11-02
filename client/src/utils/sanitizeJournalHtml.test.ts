// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { sanitizeJournalHtml } from './sanitizeJournalHtml'

describe('sanitizeJournalHtml', () => {
  it('keeps formatting and inline photos', () => {
    const html = '<div><b>Morning</b> walk<br><img src="data:image/png;base64,AAAA" alt="us"></div>'
    expect(sanitizeJournalHtml(html)).toBe(html)
  })

  it('keeps https photos', () => {
    const html = '<img src="https://res.cloudinary.com/x/y.jpg">'
    expect(sanitizeJournalHtml(html)).toBe(html)
  })

  it.each([
    ['event handler', '<img src=x onerror="alert(1)">'],
    ['script tag', '<script>alert(1)</script>'],
    ['javascript url', '<img src="javascript:alert(1)">'],
    ['svg onload', '<svg onload="alert(1)"></svg>'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['link', '<a href="javascript:alert(1)">x</a>'],
    ['data html url', '<img src="data:text/html,<script>alert(1)</script>">'],
    ['style attribute', '<div style="background:url(javascript:alert(1))">x</div>']
  ])('strips %s', (_name, payload) => {
    const out = sanitizeJournalHtml(payload)
    expect(out).not.toMatch(/onerror|onload|<script|javascript:|<iframe|<svg|<a |style=|data:text/i)
  })
})
