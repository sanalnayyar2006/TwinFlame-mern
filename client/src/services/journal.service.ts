import { api } from '../lib/api'
import { request, hasKeys } from './request'
import type { JournalEntry } from '../types/journal'
import type { Page } from '../types/page'

interface ListResponse { entries: JournalEntry[]; nextCursor: string | null; total: number }

const pageQuery = (before?: string, limit?: number) => {
  const q = new URLSearchParams()
  if (before) q.set('before', before)
  if (limit) q.set('limit', String(limit))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const journalService = {
  list: async (before?: string, limit?: number): Promise<Page<JournalEntry>> => {
    const data = await request<ListResponse>(() => api.get(`/journal${pageQuery(before, limit)}`), hasKeys('entries'))
    return { items: data.entries, nextCursor: data.nextCursor ?? null, total: data.total ?? data.entries.length }
  },

  create: async (title: string, content: string) =>
    (await request<{ entry: JournalEntry }>(() => api.post('/journal', { title, content }), hasKeys('entry'))).entry,

  updateContent: async (id: string, content: string) =>
    (await request<{ entry: JournalEntry }>(() => api.patch(`/journal/${id}`, { content }), hasKeys('entry'))).entry,

  remove: (id: string) =>
    request<{ message: string }>(() => api.delete(`/journal/${id}`), data => hasKeys('message')(data) && (data as { message: string }).message === 'Entry deleted'),

  // Uploads to Cloudinary through the API and returns the URL to put in the entry's HTML
  uploadImage: async (file: File) => {
    const form = new FormData()
    form.append('image', file)
    return (await request<{ url: string }>(() => api.upload('/journal/images', form), hasKeys('url'))).url
  }
}
