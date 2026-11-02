import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeartIcon, CheckIcon } from '../Icons'
import { DAILY_NOTE_MAX, type DailyConnection, type DailyResponse } from '../../types/dailyConnection'
import styles from './DailyConnectionCard.module.css'

interface DailyConnectionCardProps {
  data: DailyConnection | null
  loading: boolean
  error: string | null
  onRetry: () => void
  saving: boolean
  saveError: string | null
  onComplete: (note: string) => Promise<boolean>
  onUpdateNote: (note: string) => Promise<boolean>
  partnerName: string | null
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const wasEdited = (r: DailyResponse) => r.updatedAt !== r.completedAt

export const DailyConnectionCard = ({
  data,
  loading,
  error,
  onRetry,
  saving,
  saveError,
  onComplete,
  onUpdateNote,
  partnerName
}: DailyConnectionCardProps) => {
  const noteId = useId()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [skipped, setSkipped] = useState(false)

  if (loading) {
    return (
      <section className={styles.card} aria-label="Daily Connection" aria-busy="true">
        <span className={styles.srOnly}>Loading today's connection</span>
        <div className={`${styles.skeleton} ${styles.skeletonLabel}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
        <div className={`${styles.skeleton} ${styles.skeletonLineShort}`} />
        <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className={styles.card} aria-label="Daily Connection">
        <div className={styles.labelRow}>
          <HeartIcon size={16} />
          <span className={styles.label}>Daily Connection</span>
        </div>
        <p className={styles.errorText} role="alert">
          Today's question didn't load. {error}
        </p>
        <button type="button" className={styles.btnSecondary} onClick={onRetry}>
          Try again
        </button>
      </section>
    )
  }

  const mine = data.mine
  const tooLong = draft.trim().length > DAILY_NOTE_MAX

  const startEditing = () => {
    setDraft(mine?.note ?? '')
    setEditing(true)
  }

  const handleComplete = async () => {
    if (await onComplete(draft.trim())) setDraft('')
  }

  const handleSaveEdit = async () => {
    if (await onUpdateNote(draft.trim())) setEditing(false)
  }

  const noteField = (label: string) => (
    <div className={styles.field}>
      <label htmlFor={noteId} className={styles.fieldLabel}>{label}</label>
      <textarea
        id={noteId}
        className={styles.textarea}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={3}
        aria-describedby={`${noteId}-count`}
        aria-invalid={tooLong}
      />
      <span
        id={`${noteId}-count`}
        className={`${styles.count} ${tooLong ? styles.countOver : ''}`}
      >
        {draft.trim().length} / {DAILY_NOTE_MAX}
      </span>
    </div>
  )

  return (
    <section className={styles.card} aria-label="Daily Connection">
      <div className={styles.header}>
        <div className={styles.labelRow}>
          <HeartIcon size={16} />
          <span className={styles.label}>Daily Connection</span>
        </div>
        {mine && (
          <span className={styles.doneBadge}>
            <CheckIcon size={14} />
            Done today
          </span>
        )}
      </div>

      <p className={styles.question}>{data.prompt}</p>

      {/* Your answer */}
      {!mine && skipped && (
        <div className={styles.block}>
          <p className={styles.muted}>Skipped for today. You can still answer until the day ends.</p>
          <button type="button" className={styles.btnSecondary} onClick={() => setSkipped(false)}>
            Answer now
          </button>
        </div>
      )}

      {!mine && !skipped && (
        <div className={styles.block}>
          {noteField(partnerName ? `Add a note for ${partnerName} (optional)` : 'Add a note (optional)')}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleComplete}
              disabled={saving || tooLong}
            >
              {saving ? 'Saving…' : 'Mark as done'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setSkipped(true)}
              disabled={saving}
            >
              Skip today
            </button>
          </div>
        </div>
      )}

      {mine && editing && (
        <div className={styles.block}>
          {noteField('Your note')}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSaveEdit}
              disabled={saving || tooLong}
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mine && !editing && (
        <div className={styles.answer}>
          <div className={styles.answerHead}>
            <span className={styles.answerWho}>You</span>
            <span className={styles.answerMeta}>
              {formatTime(mine.completedAt)}
              {wasEdited(mine) && ' · edited'}
            </span>
          </div>
          {mine.note
            ? <p className={styles.note}>{mine.note}</p>
            : <p className={styles.muted}>Marked as done, no note.</p>}
          <button type="button" className={styles.linkBtn} onClick={startEditing}>
            {mine.note ? 'Edit note' : 'Add a note'}
          </button>
        </div>
      )}

      {saveError && <p className={styles.errorText} role="alert">{saveError}</p>}

      {/* Partner's answer, announced when it arrives */}
      <div className={styles.partnerZone} aria-live="polite">
        {!partnerName && (
          <p className={styles.muted}>
            <Link to="/link-partner" className={styles.inlineLink}>Link your partner</Link>
            {' '}and they'll see your answers here.
          </p>
        )}

        {partnerName && !data.partner && (
          <p className={styles.muted}>
            Waiting for {partnerName}. Their answer shows up here as soon as they finish.
          </p>
        )}

        {partnerName && data.partner && (
          <div className={`${styles.answer} ${styles.partnerAnswer}`}>
            <div className={styles.answerHead}>
              <span className={styles.answerWho}>
                <span className={styles.avatar} aria-hidden="true">{partnerName[0].toUpperCase()}</span>
                {partnerName}
              </span>
              <span className={styles.answerMeta}>
                {formatTime(data.partner.completedAt)}
                {wasEdited(data.partner) && ' · edited'}
              </span>
            </div>
            {data.partner.note
              ? <p className={styles.note}>{data.partner.note}</p>
              : <p className={styles.muted}>Marked as done, no note.</p>}
          </div>
        )}
      </div>

      {data.sharedClock && partnerName && (
        <p className={styles.clockNote}>
          You and {partnerName} are in different time zones, so today follows UTC for both of you.
        </p>
      )}
    </section>
  )
}
