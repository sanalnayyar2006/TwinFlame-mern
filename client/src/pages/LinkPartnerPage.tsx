import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { FlameIcon, CopyIcon, CheckIcon } from '../components/Icons'
import styles from './LinkPartnerPage.module.css'

const LinkPartnerPage = () => {
  const [coupleCode, setCoupleCode] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api.get('/auth/me')
        if (data.user) {
          setCoupleCode(data.user.coupleCode)
          if (data.user.partnerId) {
            navigate('/dashboard')
            return
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchUser()
  }, [navigate])

  const handleCopy = () => {
    navigator.clipboard.writeText(coupleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!partnerCode) {
      setError("Please enter your partner's code")
      return
    }
    if (partnerCode.trim().toUpperCase() === coupleCode) {
      setError('You cannot link with your own code')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await api.post('/auth/link-partner', {
        partnerCode: partnerCode.trim().toUpperCase()
      })
      if (data.message === 'Partner linked successfully' || data.success) {
        navigate('/dashboard')
      } else {
        setError(data.message || 'Unable to link with this code')
      }
    } catch {
      setError('Unable to link partner. Please verify the code.')
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
          <h1 className={styles.heading}>Connect with your partner</h1>
          <p className={styles.subtext}>Share your code or enter your partner's to link your spaces.</p>
        </header>

        <main className={styles.main}>
          {/* Your Code Section */}
          <div className={styles.section}>
            <label className={styles.label}>Your Couple Code</label>
            <div className={styles.codeBox}>
              <span className={styles.code}>{coupleCode || '------'}</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
                aria-label="Copy couple code"
              >
                {copied ? (
                  <>
                    <CheckIcon size={16} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={16} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className={styles.hint}>Send this 6-character code to your partner</p>
          </div>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Enter Partner Code Section */}
          <form onSubmit={handleLink} className={styles.section}>
            <label htmlFor="partner-code-input" className={styles.label}>
              Enter Partner's Code
            </label>
            <input
              id="partner-code-input"
              className={styles.input}
              type="text"
              placeholder="e.g. AB12CD"
              maxLength={6}
              value={partnerCode}
              onChange={e => setPartnerCode(e.target.value.toUpperCase())}
            />

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !partnerCode.trim()}
            >
              {loading ? 'Linking spaces...' : 'Link Partner Space'}
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}

export default LinkPartnerPage