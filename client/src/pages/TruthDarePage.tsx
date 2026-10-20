import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api'
import { Navigation } from '../components/Navigation'
import {
  CardsIcon,
  ShieldQuestionIcon,
  FlameAdventureIcon,
  XIcon
} from '../components/Icons'
import styles from './TruthDarePage.module.css'

const TruthDarePage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionData, setQuestionData] = useState<{ text: string; category: string } | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && questionData) {
      setIsFlipped(false)
      setTimeout(() => setQuestionData(null), 250)
    }
  }, [questionData])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const fetchQuestion = async (category: 'truth' | 'dare') => {
    setLoading(true)
    setError(null)
    setIsFlipped(false)
    try {
      const data = await api.get(`/truth-dare/question?category=${category}`)
      if (data && data.question) {
        setQuestionData(data.question)
        setTimeout(() => setIsFlipped(true), 50)
      } else {
        setError('No question available at the moment.')
      }
    } catch {
      setError('Unable to load question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageContainer}>
      <Navigation />

      <div className={styles.contentWrap}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.headerIcon}>
              <CardsIcon size={24} />
            </span>
            <h1 className={styles.title}>Truth or Dare</h1>
          </div>
          <p className={styles.subtitle}>
            Intimate questions and fun challenges to bring you closer.
          </p>
        </header>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className={styles.dismissBtn}>Dismiss</button>
          </div>
        )}

        <main className={styles.main}>
          {!questionData ? (
            <div className={styles.selectionGrid}>
              {/* TRUTH Card */}
              <button
                type="button"
                className={`${styles.card} ${styles.truthCard}`}
                onClick={() => fetchQuestion('truth')}
                disabled={loading}
              >
                <div className={styles.iconCircle}>
                  <ShieldQuestionIcon size={32} />
                </div>
                <h2 className={styles.cardHeading}>TRUTH</h2>
                <p className={styles.cardDesc}>Reveal your honest feelings and unspoken thoughts.</p>
                <span className={styles.cardAction}>
                  {loading ? 'Drawing question...' : 'Choose Truth'}
                </span>
              </button>

              {/* DARE Card */}
              <button
                type="button"
                className={`${styles.card} ${styles.dareCard}`}
                onClick={() => fetchQuestion('dare')}
                disabled={loading}
              >
                <div className={styles.iconCircle}>
                  <FlameAdventureIcon size={32} />
                </div>
                <h2 className={styles.cardHeading}>DARE</h2>
                <p className={styles.cardDesc}>Playful challenges and spontaneous moments together.</p>
                <span className={styles.cardAction}>
                  {loading ? 'Drawing challenge...' : 'Choose Dare'}
                </span>
              </button>
            </div>
          ) : (
            <div className={`${styles.resultContainer} ${isFlipped ? styles.flipped : ''}`}>
              <div className={`${styles.questionCard} ${questionData.category === 'truth' ? styles.truthTheme : styles.dareTheme}`}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardCategory}>
                    {questionData.category === 'truth' ? 'Truth Prompt' : 'Dare Challenge'}
                  </span>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => {
                      setIsFlipped(false)
                      setTimeout(() => setQuestionData(null), 250)
                    }}
                    aria-label="Back to selection"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <p className={styles.questionText}>{questionData.text}</p>

                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={styles.nextBtn}
                    onClick={() => fetchQuestion(questionData.category as 'truth' | 'dare')}
                    disabled={loading}
                  >
                    {loading ? 'Loading next...' : `Next ${questionData.category}`}
                  </button>

                  <button
                    type="button"
                    className={styles.backSelectBtn}
                    onClick={() => {
                      setIsFlipped(false)
                      setTimeout(() => setQuestionData(null), 250)
                    }}
                  >
                    Switch category
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default TruthDarePage
