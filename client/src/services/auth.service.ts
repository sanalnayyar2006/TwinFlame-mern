import { api } from '../lib/api'

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
  }
}
