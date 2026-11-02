import { api } from '../lib/api'
import { request, hasKeys } from './request'

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

  // Shared sample couple; the API only offers this when DEMO_MODE=true
  demoLogin: async (as: DemoPartner) => {
    const { token } = await request<{ token: string }>(() => api.post('/auth/demo', { as }), hasKeys('token'))
    localStorage.setItem('token', token)
  }
}
