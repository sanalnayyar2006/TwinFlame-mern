import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type DemoPartner } from '../services/auth.service'

export const isDemoEnabled = import.meta.env.VITE_DEMO_MODE === 'true'

export function useDemoLogin() {
  const navigate = useNavigate()
  const [entering, setEntering] = useState<DemoPartner | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enter = useCallback(async (as: DemoPartner) => {
    setEntering(as)
    setError(null)
    try {
      await authService.demoLogin(as)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setEntering(null)
    }
  }, [navigate])

  return { enter, entering, error }
}
