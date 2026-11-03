export interface Partner {
  _id: string
  name: string
  mood?: string | null
}

// The signed-in user as returned by GET /auth/me (partner populated)
export interface CurrentUser {
  _id: string
  name: string
  email?: string
  coupleCode: string
  mood?: string | null
  partnerId: Partner | null
}
