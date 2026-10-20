import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navigation } from '../components/Navigation'
import { HeartIcon, CheckIcon, BookOpenIcon } from '../components/Icons'
import styles from './DashboardPage.module.css'

const DAILY_QUESTIONS = [
  "What is one thing you appreciate about your partner today?",
  "What was a small moment this week that made you smile thinking of them?",
  "What is a dream you'd love for both of you to experience together this year?",
  "What is something your partner did recently that made you feel cared for?"
]

const DailyTaskPage = () => {
  const [done, setDone] = useState(false)
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  const question = DAILY_QUESTIONS[0]

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reflection.trim()) return
    setSaved(true)
    setDone(true)
  }

  return (
    <div className={styles.pageContainer}>
      <Navigation />

      <div className={styles.contentWrap}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <header style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', marginBottom: 8 }}>
              <HeartIcon size={24} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Daily Connection
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2.2rem', color: 'var(--color-text-light)' }}>
              Today's Reflection
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: 4 }}>
              Take a quiet moment together to pause and connect.
            </p>
          </header>

          <section className={styles.taskCard}>
            <div className={styles.taskHeader}>
              <span className={styles.taskLabel}>Prompt for Today</span>
              {done && <span className={styles.taskDoneBadge}>Completed</span>}
            </div>

            <p className={styles.taskQuestion}>{question}</p>

            {!saved ? (
              <form onSubmit={handleSaveReflection} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                  className={styles.modalInput}
                  style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
                  placeholder="Share a quick thought or gratitude..."
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="submit"
                    className={styles.taskBtnPrimary}
                    style={{ flex: 1 }}
                    disabled={!reflection.trim()}
                  >
                    Save Reflection
                  </button>
                  <button
                    type="button"
                    className={styles.taskBtnSecondary}
                    onClick={() => setDone(true)}
                  >
                    Mark as Done
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.25)', padding: 16, borderRadius: 'var(--radius-sm)', color: '#86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
                  <CheckIcon size={18} />
                  <span>Reflection shared</span>
                </div>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem' }}>{reflection}</p>
              </div>
            )}
          </section>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate('/journal')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <BookOpenIcon size={18} />
              <span>Want to write more? Open your shared journal →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyTaskPage
