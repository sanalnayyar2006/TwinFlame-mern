import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FlameIcon } from '../components/Icons'
import styles from './loginPage.module.css'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    try {
      setLoading(true)
      setError('')

      const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
      const url = `${API_URL}/api/auth/login`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const rawText = await res.text()
      let bodyText: Record<string, unknown> | null = null
      try {
        bodyText = JSON.parse(rawText)
      } catch {
        // fallback
      }

      if (!res.ok) {
        const message = bodyText && typeof bodyText.message === 'string'
          ? bodyText.message
          : 'Invalid email or password'
        setError(message)
        return
      }

      if (bodyText && typeof bodyText['token'] === 'string') {
        localStorage.setItem('token', bodyText['token'] as string)
      } else {
        const userId = bodyText && typeof bodyText['user'] === 'object' && bodyText['user']
          ? (bodyText['user'] as Record<string, unknown>)['id']
          : undefined
        localStorage.setItem('token', userId ? String(userId) : '')
      }
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Unable to connect. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.brandRow}>
            <span className={styles.brandIcon}>
              <FlameIcon size={28} />
            </span>
            <h2 className={styles.brand}>TwinFlame</h2>
          </div>
          <p className={styles.subtext}>Your story continues here.</p>
        </header>

        <main className={styles.main}>
          <h1 className={styles.heading}>Welcome back</h1>

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="login-email" className={styles.label}>Email</label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="login-password" className={styles.label}>Password</label>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className={styles.link}>
              Don't have an account?{' '}
              <Link to="/register">Create one</Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  )
}

export default LoginPage