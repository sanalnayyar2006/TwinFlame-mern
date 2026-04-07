import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from './loginPage.module.css'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    try {
      setLoading(true)
      setError('')
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message)
        return
      }
      // store JWT returned from server (dev-friendly). Keep cookie for production if used.
      if (data.token) {
        localStorage.setItem('token', data.token)
      } else {
        // fallback: store user id if token not returned
        localStorage.setItem('token', data.user?.id ?? '')
      }
      navigate('/dashboard')
    } catch (err) {
      // log error for debugging
  console.error(err)
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
        </div>
      </main>
    </div>
  )
}

export default LoginPage