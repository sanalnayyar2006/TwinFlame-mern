import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'

export function useSignOut() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = useCallback(async () => {
    setSigningOut(true)
    await authService.logout()
    // replace so Back doesn't return to a protected page
    navigate('/login', { replace: true })
  }, [navigate])

  return { signOut, signingOut }
}
