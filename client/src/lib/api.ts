const BASE_URL = 'http://localhost:8000/api'

const getToken = () => localStorage.getItem('token')

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })
    return res.json()
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
    return res.json()
  }
}