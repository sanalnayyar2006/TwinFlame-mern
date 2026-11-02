import { describe, it, expect } from 'vitest'
import { sanitizeJournalHtml } from '../../src/utils/sanitizeJournalHtml'

describe('sanitizeJournalHtml (server)', () => {
  it('keeps formatting and hosted or inline photos', () => {
    const html = '<div><b>Walk</b><br /><img src="https://res.cloudinary.com/x/y.jpg" /><img src="data:image/png;base64,AAAA" /></div>'
    expect(sanitizeJournalHtml(html)).toBe(html)
  })

  it.each([
    ['event handler', '<img src="x" onerror="alert(1)">'],
    ['script', '<script>alert(1)</script>'],
    ['javascript url', '<img src="javascript:alert(1)">'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['link', '<a href="javascript:alert(1)">x</a>'],
    ['style', '<div style="background:url(javascript:alert(1))">x</div>'],
    ['protocol-relative src', '<img src="//evil.example/x.png">']
  ])('strips %s', (_n, payload) => {
    expect(sanitizeJournalHtml(payload)).not.toMatch(/onerror|<script|javascript:|<iframe|<a |style=|\/\/evil/i)
  })
})
