import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from './RegisterPage.module.css'

const RegisterPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    try {
      setLoading(true)
      setError('')
  // use Vite proxy in development so phone only needs to reach Vite dev server
  const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
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
        localStorage.setItem('token', data.user?.id ?? '')
      }
      navigate('/link-partner')
    } catch (err) {
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
      </header>

      <main className={styles.main}>
        <h1 className={styles.heading}>Begin your<br />story.</h1>
        <p className={styles.subtext}>Create your space together.</p>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Your Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Aryan"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

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
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className={styles.link}>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default RegisterPage