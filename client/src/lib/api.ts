// In development use the Vite dev server as a proxy to the backend so mobile
// clients only need to reach the Vite host. In production use the configured
// VITE_API_URL (e.g. https://api.example.com).
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')
const BASE_URL = import.meta.env.DEV ? '/api' : `${API_BASE}/api`

const getToken = () => localStorage.getItem('token')

// A 401 while holding a token means it expired or its account is gone (e.g. the daily demo
// reset). Drop it and go to login instead of leaving every page showing errors.
const handleExpiredSession = (res: Response) => {
  if (res.status !== 401 || !getToken()) return
  localStorage.removeItem('token')
  if (window.location.pathname !== '/login') window.location.assign('/login?session=expired')
}

const jsonResponse = async (res: Response) => {
  handleExpiredSession(res)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    return jsonResponse(res)
  },

  post: async (endpoint: string, body: object) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(body)
    })
    return jsonResponse(res)
  },

  patch: async (endpoint: string, body: object) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(body)
    })
    return jsonResponse(res)
  },

  // Multipart upload; the browser sets the Content-Type boundary itself
  upload: async (endpoint: string, form: FormData) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: form
    })
    return jsonResponse(res)
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    return jsonResponse(res)
  }
}
