import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useSocket } from '../hooks/useSocket'
import { Navigation } from '../components/Navigation'
import {
  FlameIcon,
  HeartIcon,
  BookOpenIcon,
  PhotoIcon,
  CardsIcon,
  CheckIcon,
  PlusIcon,
  XIcon
} from '../components/Icons'
import styles from './DashboardPage.module.css'

interface Partner {
  _id: string
  name: string
  mood?: string | null
}

interface User {
  _id: string
  name: string
  email?: string
  coupleCode: string
  mood?: string | null
  partnerId: Partner | null
}

interface RecentJournal {
  _id: string
  title: string
  createdAt: string
}

interface RecentPhoto {
  _id: string
  imageUrl: string
  caption?: string
}

const MOODS = [
  { label: 'Calm', color: '#60a5fa' },
  { label: 'Happy', color: '#4ade80' },
  { label: 'Loved', color: '#d4637f' },
  { label: 'Energetic', color: '#e07a5f' },
  { label: 'Tired', color: '#a78bfa' },
]

const DAILY_TASK = "What is one thing you appreciate about your partner today?"

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [customMoodText, setCustomMoodText] = useState('')
  const [customMoodColor, setCustomMoodColor] = useState('#d4637f')
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [taskStatus, setTaskStatus] = useState<'idle' | 'done' | 'skipped'>('idle')
  const [recentJournal, setRecentJournal] = useState<RecentJournal | null>(null)
  const [recentPhoto, setRecentPhoto] = useState<RecentPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  // Real-time sync via socket
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

  // Keyboard escape listener for custom mood modal (R-32)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showMoodModal) {
      setShowMoodModal(false)
    }
  }, [showMoodModal])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null)
      const userData = await api.get('/auth/me')
      if (userData.user) {
        setUser(userData.user)
        if (userData.user.mood) {
          setSelectedMood(userData.user.mood)
        }
      }

      // Fetch latest journal entry for honest quick link
      try {
        const journalData = await api.get('/journal')
        if (journalData.entries && journalData.entries.length > 0) {
          setRecentJournal(journalData.entries[0])
        }
      } catch {
        // non-blocking
      }

      // Fetch latest gallery photo for honest quick link
      try {
        const token = localStorage.getItem('token')
        const galleryRes = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (galleryRes.ok) {
          const galleryData = await galleryRes.json()
          if (galleryData.images && galleryData.images.length > 0) {
            setRecentPhoto(galleryData.images[0])
          }
        }
      } catch {
        // non-blocking
      }
    } catch {
      setError('Unable to load profile data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Periodic polling for partner updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await api.get('/auth/me')
        if (data.user) {
          setUser(data.user)
          if (data.user.mood) {
            setSelectedMood(data.user.mood)
          }
        }
      } catch {
        // silent fail on poll
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  const handleMoodSelect = async (mood: string) => {
    if (selectedMood === mood) {
      setSelectedMood(null)
      await api.patch('/auth/mood', { mood: null })
    } else {
      setSelectedMood(mood)
      await api.patch('/auth/mood', { mood })
    }
  }

  const partnerName = user?.partnerId?.name ?? null
  const partnerMood = user?.partnerId?.mood ?? null
  const coupleTitle = user && partnerName ? `${user.name} & ${partnerName}` : (user?.name ?? 'TwinFlame')

  return (
    <div className={styles.pageContainer}>
      <Navigation user={user} partnerName={partnerName} />

      <div className={styles.contentWrap}>
        {/* Mobile Page Header (shown only on mobile) */}
        <header className={styles.mobileHeader}>
          <div className={styles.coupleInfo}>
            <span className={styles.fireIcon}>
              <FlameIcon size={24} />
            </span>
            <h1 className={styles.coupleTitle}>{coupleTitle}</h1>
          </div>
          <div className={styles.partnerBadge}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span>{partnerName ? `With ${partnerName}` : 'Solo Space'}</span>
          </div>
        </header>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading your space...</p>
          </div>
        ) : error ? (
          <div className={styles.errorAlert}>
            <p>{error}</p>
            <button onClick={loadDashboardData} className={styles.retryBtn}>Retry</button>
          </div>
        ) : (
          <main className={styles.dashboardGrid}>
            {/* Left Column (Primary Activities) */}
            <div className={styles.primaryColumn}>
              {/* Daily Task Card */}
              <section className={styles.taskCard} aria-label="Daily appreciation task">
                <div className={styles.taskHeader}>
                  <div className={styles.taskLabelRow}>
                    <HeartIcon size={16} className={styles.taskIcon} />
                    <span className={styles.taskLabel}>Daily Connection</span>
                  </div>
                  {taskStatus === 'done' && (
                    <span className={styles.taskDoneBadge}>Completed today</span>
                  )}
                  {taskStatus === 'skipped' && (
                    <span className={styles.taskSkippedBadge}>Skipped for now</span>
                  )}
                </div>

                <p className={styles.taskQuestion}>{DAILY_TASK}</p>

                <div className={styles.taskButtons}>
                  <button
                    className={styles.taskBtnPrimary}
                    onClick={() => setTaskStatus('done')}
                    disabled={taskStatus === 'done'}
                  >
                    {taskStatus === 'done' ? (
                      <>
                        <CheckIcon size={18} />
                        <span>Done for today</span>
                      </>
                    ) : (
                      'I shared this with my partner'
                    )}
                  </button>

                  {taskStatus !== 'done' && taskStatus !== 'skipped' && (
                    <button
                      className={styles.taskBtnSecondary}
                      onClick={() => setTaskStatus('skipped')}
                    >
                      Skip today
                    </button>
                  )}
                </div>
              </section>

              {/* Mood Section */}
              <section className={styles.moodSection} aria-label="Mood tracker">
                <div className={styles.moodSectionHeader}>
                  <h2 className={styles.sectionTitle}>How are you feeling right now?</h2>
                  {partnerMood && (
                    <p className={styles.partnerMoodStatus}>
                      <span
                        className={styles.partnerDot}
                        style={{
                          background: partnerMood.includes('||')
                            ? partnerMood.split('||')[1]
                            : (MOODS.find(m => m.label === partnerMood)?.color ?? '#d4637f')
                        }}
                      />
                      {partnerName} is feeling{' '}
                      <strong>
                        {partnerMood.includes('||') ? partnerMood.split('||')[0] : partnerMood}
                      </strong>
                    </p>
                  )}
                </div>

                <div className={styles.moodGrid}>
                  {MOODS.map(mood => {
                    const isMyMood = selectedMood === mood.label
                    const isPartnerMood = partnerMood === mood.label
                    return (
                      <button
                        key={mood.label}
                        type="button"
                        className={`${styles.moodItem} ${isMyMood ? styles.moodItemSelected : ''}`}
                        onClick={() => handleMoodSelect(mood.label)}
                        aria-pressed={isMyMood}
                      >
                        <div className={styles.moodCircleWrapper}>
                          {isPartnerMood && partnerName && (
                            <div
                              className={styles.partnerAvatar}
                              style={{ background: mood.color }}
                              title={`${partnerName}'s mood`}
                            >
                              {partnerName[0].toUpperCase()}
                            </div>
                          )}
                          <div
                            className={styles.moodCircle}
                            style={{
                              borderColor: mood.color,
                              background: isMyMood ? mood.color : `${mood.color}15`
                            }}
                          >
                            <div
                              className={styles.moodDot}
                              style={{ background: isMyMood ? '#ffffff' : mood.color }}
                            />
                          </div>
                        </div>
                        <span className={styles.moodLabel}>{mood.label}</span>
                      </button>
                    )
                  })}

                  {/* Custom mood tag if active */}
                  {(selectedMood?.includes('||') || partnerMood?.includes('||')) && (() => {
                    const moodStr = selectedMood?.includes('||') ? selectedMood! : partnerMood!
                    const [label, color] = moodStr.split('||')
                    const isMy = selectedMood === moodStr
                    const isPartner = partnerMood === moodStr
                    return (
                      <button
                        type="button"
                        className={`${styles.moodItem} ${isMy ? styles.moodItemSelected : ''}`}
                        onClick={() => handleMoodSelect(moodStr)}
                      >
                        <div className={styles.moodCircleWrapper}>
                          {isPartner && partnerName && (
                            <div className={styles.partnerAvatar} style={{ background: color }}>
                              {partnerName[0].toUpperCase()}
                            </div>
                          )}
                          <div
                            className={styles.moodCircle}
                            style={{ borderColor: color, background: isMy ? color : `${color}15` }}
                          >
                            <div
                              className={styles.moodDot}
                              style={{ background: isMy ? '#ffffff' : color }}
                            />
                          </div>
                        </div>
                        <span className={styles.moodLabel}>{label}</span>
                      </button>
                    )
                  })()}

                  {/* Add custom mood button */}
                  <button
                    type="button"
                    className={styles.moodItem}
                    onClick={() => setShowMoodModal(true)}
                    aria-label="Add custom mood"
                  >
                    <div className={styles.moodCircleWrapper}>
                      <div className={`${styles.moodCircle} ${styles.customAddCircle}`}>
                        <PlusIcon size={20} />
                      </div>
                    </div>
                    <span className={styles.moodLabel}>Custom</span>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column (Memories & Games) - fills the viewport nicely */}
            <div className={styles.secondaryColumn}>
              {/* Truth or Dare Quick Launch Card */}
              <section className={styles.gameCard} onClick={() => navigate('/truth-dare')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('/truth-dare')}>
                <div className={styles.gameCardHeader}>
                  <div className={styles.gameIconWrap}>
                    <CardsIcon size={22} />
                  </div>
                  <div className={styles.gameCardTitles}>
                    <span className={styles.gameCardTag}>Tonight's Game</span>
                    <h3 className={styles.gameCardTitle}>Truth or Dare</h3>
                  </div>
                  <span className={styles.playBadge}>Play Now</span>
                </div>
                <p className={styles.gameCardDesc}>
                  Draw a thought-provoking truth or playful dare to share with {partnerName || 'your partner'}.
                </p>
              </section>

              {/* Memories Section */}
              <section className={styles.quickLinksSection} aria-label="Memories and quick links">
                <div className={styles.sectionHeaderRow}>
                  <h2 className={styles.sectionTitle}>Recent Memories</h2>
                </div>

                <div className={styles.quickCardsGrid}>
                  <div
                    className={styles.quickCard}
                    onClick={() => navigate('/journal')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/journal')}
                  >
                    <div className={styles.quickCardIconWrap}>
                      <BookOpenIcon size={22} className={styles.quickCardIcon} />
                    </div>
                    <div className={styles.quickCardContent}>
                      <span className={styles.quickCardTag}>Shared Journal</span>
                      <p className={styles.quickCardTitle}>
                        {recentJournal ? recentJournal.title : 'Write your first journal entry'}
                      </p>
                      <span className={styles.quickCardAction}>
                        {recentJournal ? 'Read entry →' : 'Start writing →'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={styles.quickCard}
                    onClick={() => navigate('/gallery')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/gallery')}
                  >
                    <div className={styles.quickCardIconWrap}>
                      <PhotoIcon size={22} className={styles.quickCardIcon} />
                    </div>
                    <div className={styles.quickCardContent}>
                      <span className={styles.quickCardTag}>Our Gallery</span>
                      <p className={styles.quickCardTitle}>
                        {recentPhoto ? (recentPhoto.caption || 'Shared photo') : 'Add your first photo'}
                      </p>
                      <span className={styles.quickCardAction}>
                        {recentPhoto ? 'Open gallery →' : 'Upload photo →'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Partner Space Info / Invitation */}
              <section className={styles.spaceCard} aria-label="Space overview">
                <h2 className={styles.sectionTitle}>Shared Haven</h2>
                <div className={styles.spaceContent}>
                  <p className={styles.spaceText}>
                    {partnerName
                      ? `You and ${partnerName} share a private haven for thoughts, photos, and game nights.`
                      : 'You are currently in your solo space. Link with your partner anytime to share memories.'}
                  </p>
                  {!partnerName && (
                    <button
                      onClick={() => navigate('/link-partner')}
                      className={styles.linkPartnerBtn}
                    >
                      Connect Partner
                    </button>
                  )}
                </div>
              </section>
            </div>
          </main>
        )}
      </div>

      {/* Accessible Custom Mood Modal (R-32) */}
      {showMoodModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowMoodModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-mood-title"
        >
          <div
            className={styles.modalCard}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="custom-mood-title" className={styles.modalTitle}>Set Custom Mood</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowMoodModal(false)}
                aria-label="Close modal"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <label htmlFor="custom-mood-input" className={styles.modalLabel}>
                How are you feeling?
              </label>
              <input
                id="custom-mood-input"
                type="text"
                autoFocus
                placeholder="e.g. Hopeful, Grateful, Excited"
                value={customMoodText}
                onChange={e => setCustomMoodText(e.target.value)}
                maxLength={24}
                className={styles.modalInput}
              />

              <label className={styles.modalLabel}>Color Accent</label>
              <div className={styles.colorPalette}>
                {['#d4637f', '#e07a5f', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.colorChip} ${customMoodColor === color ? styles.colorChipSelected : ''}`}
                    style={{ background: color }}
                    onClick={() => setCustomMoodColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowMoodModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSaveBtn}
                onClick={() => {
                  if (customMoodText.trim()) {
                    handleMoodSelect(`${customMoodText.trim()}||${customMoodColor}`)
                    setShowMoodModal(false)
                    setCustomMoodText('')
                  }
                }}
                disabled={!customMoodText.trim()}
              >
                Save Mood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage