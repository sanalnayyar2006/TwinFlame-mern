import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from './loginPage.module.css'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // debug state to help mobile debugging when remote inspector isn't available
  const [debugUrl, setDebugUrl] = useState<string | null>(null)
  const [debugStatus, setDebugStatus] = useState<number | null>(null)
  const [debugBody, setDebugBody] = useState<string | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    try {
      setLoading(true)
      setError('')
      setDebugError(null)
  // use Vite proxy in development (empty API_BASE so request goes to /api)
  const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  const url = `${API_URL}/api/auth/login`
      setDebugUrl(url)

      // add a timeout so the UI doesn't stay 'Signing in...' forever
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      let bodyText: string | Record<string, unknown>
      try {
        bodyText = await res.json()
        setDebugBody(JSON.stringify(bodyText))
      } catch {
        const t = await res.text()
        bodyText = t
        setDebugBody(t)
      }

      setDebugStatus(res.status)

      if (!res.ok) {
        // show raw response as message
        const message = typeof bodyText === 'object' ? JSON.stringify(bodyText) : String(bodyText)
        setError(message || 'Something went wrong')
        return
      }

      // store JWT returned from server (dev-friendly). Keep cookie for production if used.
      const jsonBody = typeof bodyText === 'object' && bodyText ? (bodyText as Record<string, unknown>) : null
      if (jsonBody && typeof jsonBody['token'] === 'string') {
        localStorage.setItem('token', jsonBody['token'] as string)
      } else {
        const userId = jsonBody && typeof jsonBody['user'] === 'object' ? (jsonBody['user'] as Record<string, unknown>)['id'] : undefined
        localStorage.setItem('token', userId ? String(userId) : '')
      }
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setDebugError(String(err))
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.brand}>TwinFlame</h2>
        <p className={styles.subtext}>Your story continues here.</p>

      </header>

      <main className={styles.main}>
        <h1 className={styles.heading}>Welcome<br />back.</h1>
        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.button}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className={styles.link}>
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
          {/* Debug panel shown on-screen to help mobile debugging without remote inspector */}
          <div style={{marginTop:12, padding:8, border:'1px solid rgba(0,0,0,0.06)', borderRadius:6, fontSize:12}}>
            <strong>Debug</strong>
            <div>URL: <small>{debugUrl ?? '-'}</small></div>
            <div>Status: <small>{debugStatus ?? '-'}</small></div>
            <div>Body: <pre style={{whiteSpace:'pre-wrap', maxHeight:120, overflow:'auto'}}>{debugBody ?? '-'}</pre></div>
            <div>Error: <small>{debugError ?? '-'}</small></div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LoginPage