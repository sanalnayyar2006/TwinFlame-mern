import { api } from '../lib/api'
import { request, hasKeys } from './request'
import type { CurrentUser } from '../types/user'

export type DemoPartner = 'ana' | 'ben'

export const authService = {
  // Clears the server's httpOnly cookie, then the token this browser keeps
  logout: async () => {
    try {
      await api.post('/auth/logout', {})
    } catch {
      // Offline: still sign out on this device
    } finally {
      localStorage.removeItem('token')
    }
  },

  // Preset label, "Label||#rrggbb" for a custom mood, or null to clear
  setMood: (mood: string | null) =>
    request<{ message: string }>(() => api.patch('/auth/mood', { mood }), hasKeys('message')),

  me: async () => (await request<{ user: CurrentUser }>(() => api.get('/auth/me'), hasKeys('user'))).user,

  // Shared sample couple; the API only offers this when DEMO_MODE=true
  demoLogin: async (as: DemoPartner) => {
    const { token } = await request<{ token: string }>(() => api.post('/auth/demo', { as }), hasKeys('token'))
    localStorage.setItem('token', token)
  }
}
