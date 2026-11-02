import sanitizeHtml from 'sanitize-html'

// The journal editor is contentEditable, so entries are HTML. Keep basic formatting and inline photos,
// drop scripts, event handlers, styles, and links. The client sanitizes again on render.
export const sanitizeJournalHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ['p', 'div', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'img'],
    allowedAttributes: { img: ['src', 'alt'] },
    allowedSchemesByTag: { img: ['data', 'https'] },
    allowProtocolRelative: false
  })
