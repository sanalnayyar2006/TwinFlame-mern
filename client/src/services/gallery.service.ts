import { api } from '../lib/api'
import { request, hasKeys } from './request'
import type { GalleryImage } from '../types/gallery'
import type { Page } from '../types/page'

interface ListResponse { images: GalleryImage[]; nextCursor: string | null; total: number }

export const galleryService = {
  list: async (before?: string, limit?: number): Promise<Page<GalleryImage>> => {
    const q = new URLSearchParams()
    if (before) q.set('before', before)
    if (limit) q.set('limit', String(limit))
    const qs = q.toString()
    const data = await request<ListResponse>(() => api.get(`/gallery${qs ? `?${qs}` : ''}`), hasKeys('images'))
    return { items: data.images, nextCursor: data.nextCursor ?? null, total: data.total ?? data.images.length }
  },

  upload: (file: File, caption: string) => {
    const form = new FormData()
    form.append('image', file)
    form.append('caption', caption)
    return request<GalleryImage>(() => api.upload('/gallery', form), hasKeys('_id', 'imageUrl'))
  },

  updateCaption: (id: string, caption: string) =>
    request<GalleryImage>(() => api.patch(`/gallery/${id}`, { caption }), hasKeys('_id')),

  remove: (id: string) =>
    request<{ message: string }>(() => api.delete(`/gallery/${id}`), data => hasKeys('message')(data) && (data as { message: string }).message === 'Photo deleted')
}
