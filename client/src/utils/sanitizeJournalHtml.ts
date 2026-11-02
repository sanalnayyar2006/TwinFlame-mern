import DOMPurify from 'dompurify'

// Journal entries are stored HTML from a contentEditable editor. Same allow-list as the server
// (server/src/utils/sanitizeJournalHtml.ts), applied again on render in case old entries predate it.
export const sanitizeJournalHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'img'],
    ALLOWED_ATTR: ['src', 'alt'],
    ALLOWED_URI_REGEXP: /^(?:https:|data:image\/)/i
  })
