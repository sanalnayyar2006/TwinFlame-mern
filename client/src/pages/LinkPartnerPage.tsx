import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import styles from './LinkPartnerPage.module.css'

const LinkPartnerPage = () => {
  const [coupleCode, setCoupleCode] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Fetch current user's coupleCode on mount
  useEffect(() => {
    const fetchUser = async () => {
      const data = await api.get('/auth/me')
      console.log('API response:', data)
      if (data.user) {
        setCoupleCode(data.user.coupleCode)
        if (data.user.partnerId) {
        navigate('/dashboard')
        return
      }
    }
      
    }
    fetchUser()
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(coupleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLink = async () => {
    if (!partnerCode) {
      setError('Please enter your partner\'s code')
      return
    }
    if (partnerCode === coupleCode) {
      setError('You cannot link with yourself!')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await api.post('/auth/link-partner', { partnerCode })
      if (data.message === 'Partner linked successfully') {
        navigate('/dashboard')
      } else {
        setError(data.message || 'Something went wrong')
      }
    } catch (err) {
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
        <h1 className={styles.heading}>Find your<br />other half.</h1>
        <p className={styles.subtext}>Share your code. Start your story.</p>

        {/* Your Code Section */}
        <div className={styles.section}>
          <label className={styles.label}>Your Couple Code</label>
          <div className={styles.codeBox}>
            <span className={styles.code}>{coupleCode || '...'}</span>
            <button
              className={styles.copyBtn}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <p className={styles.hint}>Share this code with your partner</p>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or enter partner's code</span>
        </div>

        {/* Enter Partner Code Section */}
        <div className={styles.section}>
          <label className={styles.label}>Partner's Code</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Enter code..."
            maxLength={6}
            value={partnerCode}
            onChange={e => setPartnerCode(e.target.value.toUpperCase())}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.button}
          onClick={handleLink}
          disabled={loading}
        >
          {loading ? 'Linking...' : 'Start your story →'}
        </button>
      </main>
    </div>
  )
}

export default LinkPartnerPage