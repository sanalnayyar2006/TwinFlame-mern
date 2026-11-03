import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useDailyConnection } from '../hooks/useDailyConnection'
import { useDashboardData } from '../hooks/useDashboardData'
import { useMood } from '../hooks/useMood'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { DailyConnectionCard } from '../components/dashboard/DailyConnectionCard'
import { Navigation } from '../components/Navigation'
import { MoodSection } from './dashboard/MoodSection'
import { CustomMoodDialog } from './dashboard/CustomMoodDialog'
import { FlameIcon, HeartIcon, BookOpenIcon, PhotoIcon, CardsIcon } from '../components/Icons'
import styles from './DashboardPage.module.css'

const DashboardPage = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [showMoodDialog, setShowMoodDialog] = useState(false)

  const { user, setUser, recentJournal, recentPhoto, counts, activity, loading, error, reload } = useDashboardData()
  const mood = useMood(user, setUser)
  const dailyConnection = useDailyConnection(user?._id ?? null)
  const push = usePushNotifications()

  // Real-time sync via socket
  useSocket(token, {
    onMoodUpdate: data => {
      if (user && data.userId !== user._id) mood.applyPartnerMood(data.mood ?? null)
    },
    onDailyConnectionUpdate: dailyConnection.handleRealtimeUpdate,
    // A partner just linked: load their name and mood, and today's shared card
    onPartnerLinked: () => {
      void reload()
      dailyConnection.reload()
    }
  })

  const partnerName = user?.partnerId?.name ?? null
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
            <button onClick={() => void reload()} className={styles.retryBtn}>Retry</button>
          </div>
        ) : (
          <main className={styles.dashboardGrid}>
            {/* Left Column (Primary Activities) */}
            <div className={styles.primaryColumn}>
              <DailyConnectionCard
                data={dailyConnection.data}
                loading={dailyConnection.loading}
                error={dailyConnection.error}
                onRetry={dailyConnection.reload}
                saving={dailyConnection.saving}
                saveError={dailyConnection.saveError}
                onComplete={dailyConnection.complete}
                onUpdateNote={dailyConnection.updateNote}
                partnerName={partnerName}
                push={push.state === 'unavailable' ? undefined : {
                  state: push.state,
                  busy: push.busy,
                  error: push.error,
                  onEnable: () => void push.enable(),
                  onDisable: () => void push.disable()
                }}
              />

              <MoodSection
                myMood={mood.myMood}
                partnerMood={mood.partnerMood}
                partnerName={partnerName}
                onSelect={m => void mood.select(m)}
                onAddCustom={() => setShowMoodDialog(true)}
              />
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
          <section className={styles.statsSection} aria-label="Statistics">
            <h2 className={styles.sectionTitle}>Statistics</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <BookOpenIcon size={20} className={styles.statIcon} />
                <span className={styles.statValue}>{counts.journals}</span>
                <span className={styles.statLabel}>Journal Entries</span>
              </div>
              <div className={styles.statCard}>
                <PhotoIcon size={20} className={styles.statIcon} />
                <span className={styles.statValue}>{counts.photos}</span>
                <span className={styles.statLabel}>Photos</span>
              </div>
              <div className={styles.statCard}>
                <FlameIcon size={20} className={styles.statIcon} />
                <span className={styles.statValue}>{dailyConnection.data?.streak.current ?? 0}</span>
                <span className={styles.statLabel}>Day Streak</span>
              </div>
            </div>
          </section>

          <section className={styles.quickActionsSection} aria-label="Quick actions">
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActionsGrid}>
              <button className={styles.quickActionBtn} onClick={() => navigate('/journal')}>
                <BookOpenIcon size={18} /> Write Journal
              </button>
              <button className={styles.quickActionBtn} onClick={() => navigate('/gallery')}>
                <PhotoIcon size={18} /> Upload Photo
              </button>
              <button className={styles.quickActionBtn} onClick={() => navigate('/truth-dare')}>
                <CardsIcon size={18} /> Play Truth or Dare
              </button>
              {!partnerName && (
                <button className={styles.quickActionBtn} onClick={() => navigate('/link-partner')}>
                  <HeartIcon size={18} /> Link Partner
                </button>
              )}
            </div>
          </section>

          <section className={styles.activitySection} aria-label="Recent activity">
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            {activity.length === 0 ? (
              <p className={styles.emptyState}>No recent activity yet.</p>
            ) : (
              <ul className={styles.activityList}>
                {activity.slice(0, 2).map((a, i) => (
                  <li key={i} className={styles.activityItem}>{a.text}</li>
                ))}
              </ul>
            )}
          </section>
      </div>

      {showMoodDialog && (
        <CustomMoodDialog onSave={m => void mood.select(m)} onClose={() => setShowMoodDialog(false)} />
      )}
    </div>
  )
}

export default DashboardPage