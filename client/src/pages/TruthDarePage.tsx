import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import styles from './TruthDarePage.module.css'

const TruthDarePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [questionData, setQuestionData] = useState<{ text: string, category: string } | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  const fetchQuestion = async (category: 'truth' | 'dare') => {
    setLoading(true)
    setIsFlipped(false)
    try {
      const data = await api.get(`/truth-dare/question?category=${category}`)
      setQuestionData(data.question)
      setTimeout(() => setIsFlipped(true), 50) // small delay for animation
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.coupleInfo}>
          <span className={styles.fireIcon}>✨</span>
          <h1 className={styles.coupleTitle}>Truth or Dare</h1>
        </div>
        <div className={styles.streak}>
          <span>🔥</span>
          <span>TwinFlame</span>
        </div>
      </header>

      <main className={styles.main}>
        {!questionData ? (
          <div className={styles.selectionCards}>
            <button 
              className={`${styles.card} ${styles.truthCard}`}
              onClick={() => fetchQuestion('truth')}
              disabled={loading}
            >
              <span className={styles.cardIcon}>🔮</span>
              <h2>TRUTH</h2>
              <p>Reveal your deepest secrets</p>
            </button>
            <button 
              className={`${styles.card} ${styles.dareCard}`}
              onClick={() => fetchQuestion('dare')}
              disabled={loading}
            >
              <span className={styles.cardIcon}>⚡</span>
              <h2>DARE</h2>
              <p>Step out of your comfort zone</p>
            </button>
          </div>
        ) : (
          <div className={`${styles.resultContainer} ${isFlipped ? styles.flipped : ''}`}>
            <div className={styles.questionCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardCategory}>
                  {questionData.category.toUpperCase()}
                </span>
                <button 
                  className={styles.closeBtn}
                  onClick={() => {
                    setIsFlipped(false)
                    setTimeout(() => setQuestionData(null), 300)
                  }}
                >
                  ✕
                </button>
              </div>
              <p className={styles.questionText}>{questionData.text}</p>
              
              <div className={styles.actionButtons}>
                 <button 
                  className={styles.nextBtn}
                  onClick={() => fetchQuestion(questionData.category as 'truth' | 'dare')}
                >
                  Next {questionData.category}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

       {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <button className={styles.navItem} onClick={() => navigate('/dashboard')}>
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className={styles.navItem} onClick={() => navigate('/journal')}>
          <span>📖</span>
          <span>Journal</span>
        </button>
        <button className={styles.navItem} onClick={() => navigate('/gallery')}>
          <span>🖼️</span>
          <span>Gallery</span>
        </button>
        <button className={`${styles.navItem} ${styles.navActive}`}>
          <span>✨</span>
          <span>T & D</span>
        </button>
      </nav>
    </div>
  )
}

export default TruthDarePage
