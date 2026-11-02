import { PlusIcon } from '../../components/Icons'
import { PRESET_MOODS, describeMood, isCustomMood } from './moods'
import styles from '../DashboardPage.module.css'

interface MoodSectionProps {
  myMood: string | null
  partnerMood: string | null
  partnerName: string | null
  onSelect: (mood: string) => void
  onAddCustom: () => void
}

interface MoodButtonProps {
  mood: string
  label: string
  color: string
  selected: boolean
  partnerHere: boolean
  partnerName: string | null
  onSelect: (mood: string) => void
}

const MoodButton = ({ mood, label, color, selected, partnerHere, partnerName, onSelect }: MoodButtonProps) => (
  <button
    type="button"
    className={`${styles.moodItem} ${selected ? styles.moodItemSelected : ''}`}
    onClick={() => onSelect(mood)}
    aria-pressed={selected}
  >
    <div className={styles.moodCircleWrapper}>
      {partnerHere && partnerName && (
        <div className={styles.partnerAvatar} style={{ background: color }} title={`${partnerName}'s mood`}>
          {partnerName[0].toUpperCase()}
        </div>
      )}
      <div className={styles.moodCircle} style={{ borderColor: color, background: selected ? color : `${color}15` }}>
        <div className={styles.moodDot} style={{ background: selected ? '#ffffff' : color }} />
      </div>
    </div>
    <span className={styles.moodLabel}>{label}</span>
  </button>
)

export const MoodSection = ({ myMood, partnerMood, partnerName, onSelect, onAddCustom }: MoodSectionProps) => {
  // A custom mood (mine first, else my partner's) gets its own button after the presets
  const custom = isCustomMood(myMood) ? myMood : isCustomMood(partnerMood) ? partnerMood : null
  const partner = partnerMood ? describeMood(partnerMood) : null

  return (
    <section className={styles.moodSection} aria-label="Mood tracker">
      <div className={styles.moodSectionHeader}>
        <h2 className={styles.sectionTitle}>How are you feeling right now?</h2>
        {partner && (
          <p className={styles.partnerMoodStatus}>
            <span className={styles.partnerDot} style={{ background: partner.color }} />
            {partnerName} is feeling <strong>{partner.label}</strong>
          </p>
        )}
      </div>

      <div className={styles.moodGrid}>
        {PRESET_MOODS.map(m => (
          <MoodButton
            key={m.label}
            mood={m.label}
            label={m.label}
            color={m.color}
            selected={myMood === m.label}
            partnerHere={partnerMood === m.label}
            partnerName={partnerName}
            onSelect={onSelect}
          />
        ))}
        {custom && (
          <MoodButton
            mood={custom}
            {...describeMood(custom)}
            selected={myMood === custom}
            partnerHere={partnerMood === custom}
            partnerName={partnerName}
            onSelect={onSelect}
          />
        )}
        <button type="button" className={styles.moodItem} onClick={onAddCustom} aria-label="Add custom mood">
          <div className={styles.moodCircleWrapper}>
            <div className={`${styles.moodCircle} ${styles.customAddCircle}`}>
              <PlusIcon size={20} />
            </div>
          </div>
          <span className={styles.moodLabel}>Custom</span>
        </button>
      </div>
    </section>
  )
}
