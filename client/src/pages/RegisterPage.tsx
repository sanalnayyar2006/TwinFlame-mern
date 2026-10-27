import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FlameIcon } from '../components/Icons'
import { GoogleSignInButton, type GoogleAuthResponse } from '../components/GoogleSignInButton'
import styles from './RegisterPage.module.css'

const RegisterPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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

      const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })

      const rawText = await res.text()
      let data: Record<string, unknown> = {}
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        data = {}
      }

      if (!res.ok) {
        setError((data.message as string) || rawText || 'Something went wrong')
        return
      }

      if (data.token) {
        localStorage.setItem('token', data.token as string)
      } else {
        const userObj = data.user as Record<string, unknown> | undefined
        localStorage.setItem('token', (userObj?.id as string) ?? '')
      }
      navigate('/link-partner')
    } catch (err) {
      console.error(err)
      setError('Unable to register. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (data: GoogleAuthResponse) => {
    if (data.token) {
      localStorage.setItem('token', data.token)
    } else if (data.user?.id) {
      localStorage.setItem('token', data.user.id)
    }

    if (data.user?.partnerId || data.user?.coupleId) {
      navigate('/dashboard')
    } else {
      navigate('/link-partner')
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
          <p className={styles.subtext}>Create your space together.</p>
        </header>

        <main className={styles.main}>
          <h1 className={styles.heading}>Begin your story</h1>

          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.inputGroup}>
              <label htmlFor="reg-name" className={styles.label}>Your Name</label>
              <input
                id="reg-name"
                className={styles.input}
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="reg-email" className={styles.label}>Email</label>
              <input
                id="reg-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="reg-password" className={styles.label}>Password</label>
              <input
                id="reg-password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <GoogleSignInButton
              text="signup"
              disabled={loading}
              onSuccess={handleGoogleSuccess}
              onError={err => setError(err)}
            />

            <p className={styles.link}>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  )
}

export default RegisterPage