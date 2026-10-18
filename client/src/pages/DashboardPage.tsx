import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useSocket } from '../hooks/useSocket'
import styles from './DashboardPage.module.css'

interface Partner {
  _id: string
  name: string
  mood?: string
}

interface User {
  _id: string
  name: string
  coupleCode: string
  mood?: string
  partnerId: Partner | null
}

const MOODS = [
  { label: 'Calm', color: '#60a5fa' },
  { label: 'Happy', color: '#4ade80' },
  { label: 'Loved', color: '#c45f7a' },
  { label: 'Energetic', color: '#D4795A' },
  { label: 'Tired', color: '#a78bfa' },
]

const DAILY_TASK = "What's one thing you appreciate about your partner today?"

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [customMoodText, setCustomMoodText] = useState('')
  const [customMoodColor, setCustomMoodColor] = useState('#c45f7a')
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [taskDone, setTaskDone] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  // Real-time sync: whenever the partner updates their mood, reflect it
  // instantly instead of waiting for the next poll interval.
  useSocket(token, (data) => {
    if (!user) return
    if (data.userId === user._id) return
    setUser(prev => {
      if (!prev) return null
      return {
        ...prev,
        partnerId: prev.partnerId
          ? { ...prev.partnerId, mood: data.mood ?? null }
          : null
      }
    })
  })

  useEffect(() => {
    const fetchUser = async () => {
      const data = await api.get('/auth/me')
      if (data.user) {
        setUser(data.user)
        // restore saved mood
        if (data.user.mood) {
          setSelectedMood(data.user.mood)
        }
      }
    }
    fetchUser()
  }, [])
useEffect(() => {
    const interval = setInterval(async () => {
      const data = await api.get('/auth/me')
      if (data.user) {
        setUser(data.user)
        // keep local selectedMood in sync with server (covers partner updates too)
        if (data.user.mood) {
          setSelectedMood(data.user.mood)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleMoodSelect = async (mood: string) => {
    // If the clicked mood is already selected, deselect it
    if (selectedMood === mood) {
      setSelectedMood(null)
      await api.patch('/auth/mood', { mood: null })
    } else {
      setSelectedMood(mood)
      await api.patch('/auth/mood', { mood })
    }
  }

  const partnerName = user?.partnerId?.name ?? 'Partner'
  const partnerMood = user?.partnerId?.mood ?? null
  const coupleTitle = user ? `${user.name} & ${partnerName}` : 'TwinFlame'

  return (
    <div className={styles.container}>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.coupleInfo}>
          <span className={styles.fireIcon}>🔥</span>
          <h1 className={styles.coupleTitle}>{coupleTitle}</h1>
        </div>
        <div className={styles.streak}>
          <span>⚡</span>
          <span>5 Day Streak</span>
        </div>
      </header>

      <main className={styles.main}>

        {/* Daily Task Card */}
        <section className={styles.taskCard}>
          <div className={styles.taskBg}>❤️</div>
          <span className={styles.taskLabel}>Daily Task</span>
          <p className={styles.taskQuestion}>{DAILY_TASK}</p>
          <div className={styles.taskButtons}>
            <button
              className={styles.taskBtnPrimary}
              onClick={() => setTaskDone(true)}
              disabled={taskDone}
            >
              {taskDone ? '✓ Done!' : 'I did it'}
            </button>
            <button className={styles.taskBtnSecondary}>
              Skip today
            </button>
          </div>
        </section>

        {/* Mood Section */}
        <section className={styles.moodSection}>
          <h3 className={styles.sectionLabel}>How are you feeling?</h3>
          {/* Partner mood indicator */}
            {partnerMood && (
              <p className={styles.partnerMood}>
                {partnerName} is feeling{' '}
                <span style={{ color: partnerMood.includes('||') ? partnerMood.split('||')[1] : (partnerMood.startsWith('#') ? partnerMood : (MOODS.find(m => m.label === partnerMood)?.color)) }}>
                  {partnerMood.includes('||') ? partnerMood.split('||')[0] : (partnerMood.startsWith('#') ? 'Mood' : partnerMood)}
                </span>
              </p>
            )}
          <div className={styles.moodGrid}>
            {MOODS.map(mood => {
              const isMyMood = selectedMood === mood.label
              const isPartnerMood = partnerMood === mood.label
              return (
                <button
                  key={mood.label}
                  className={styles.moodItem}
                  onClick={() => handleMoodSelect(mood.label)}
                >
                  <div className={styles.moodCircleWrapper}>
                    {/* Partner avatar indicator */}
                    {isPartnerMood && (
                      <div
                        className={styles.partnerAvatar}
                        style={{ background: mood.color }}
                      >
                        {partnerName[0].toUpperCase()}
                      </div>
                    )}
                    <div
                      className={styles.moodCircle}
                      style={{
                        borderColor: mood.color,
                        background: isMyMood
                          ? mood.color
                          : `${mood.color}22`
                      }}
                    >
                      <div
                        className={styles.moodDot}
                        style={{ background: mood.color }}
                      />
                    </div>
                  </div>
                  <span className={styles.moodLabel}>{mood.label}</span>
                </button>
              )
            })}
            {/* Custom mood add */}
            {(selectedMood?.includes('||') || partnerMood?.includes('||')) && (() => {
              const moodStr = selectedMood?.includes('||') ? selectedMood! : partnerMood!
              const [label, color] = moodStr.split('||')
              const isMy = selectedMood === moodStr
              const isPartner = partnerMood === moodStr
              return (
                <button
                  className={styles.moodItem}
                  onClick={() => handleMoodSelect(moodStr)}
                >
                  <div className={styles.moodCircleWrapper}>
                    {isPartner && (
                      <div className={styles.partnerAvatar} style={{ background: color }}>
                        {partnerName[0].toUpperCase()}
                      </div>
                    )}
                    <div className={styles.moodCircle} style={{ borderColor: color, background: isMy ? color : `${color}22` }}>
                      <div className={styles.moodDot} style={{ background: color }} />
                    </div>
                  </div>
                  <span className={styles.moodLabel}>{label}</span>
                </button>
              )
            })()}
            <button
              className={styles.moodItem}
              onClick={() => setShowMoodModal(true)}
            >
              <div className={styles.moodCircleWrapper}>
                <div
                  className={styles.moodCircle}
                  style={{ borderColor: '#999', background: 'transparent' }}
                >
                  <div style={{ fontSize: 24, color: '#999' }}>+</div>
                </div>
              </div>
              <span className={styles.moodLabel}>Custom</span>
            </button>
            {showMoodModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#fff', padding: 20, borderRadius: 12, width: 300 }}>
                  <h3 style={{ marginTop: 0 }}>Custom Mood</h3>
                  <input
                    type="text"
                    placeholder="How are you feeling?"
                    value={customMoodText}
                    onChange={e => setCustomMoodText(e.target.value)}
                    style={{ width: '100%', padding: 8, marginBottom: 12 }}
                  />
                  <input
                    type="color"
                    value={customMoodColor}
                    onChange={e => setCustomMoodColor(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowMoodModal(false)}>Cancel</button>
                    <button onClick={() => {
                      if (customMoodText.trim()) {
                        handleMoodSelect(`${customMoodText.trim()}||${customMoodColor}`)
                        setShowMoodModal(false)
                        setCustomMoodText('')
                      }
                    }}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Links */}
        <section className={styles.quickLinks}>
          <div
            className={styles.quickCard}
            onClick={() => navigate('/journal')}
          >
            <div className={styles.quickIcon} style={{ background: 'rgba(196,95,122,0.2)' }}>
              📖
            </div>
            <p className={styles.quickSub}>Recent Entry</p>
            <p className={styles.quickTitle}>Beach memories...</p>
          </div>
          <div
            className={styles.quickCard}
            onClick={() => navigate('/gallery')}
          >
            <div className={styles.quickIcon} style={{ background: 'rgba(212,121,90,0.2)' }}>
              🖼️
            </div>
            <p className={styles.quickSub}>New Photos</p>
            <p className={styles.quickTitle}>Last weekend</p>
          </div>
        </section>

      </main>

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <button className={`${styles.navItem} ${styles.navActive}`}>
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
        <button className={styles.navItem} onClick={() => navigate('/truth-dare')}>
          <span>✨</span>
          <span>T & D</span>
        </button>
      </nav>

    </div>
  )
}

export default DashboardPage