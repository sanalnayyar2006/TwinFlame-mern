import { useEffect } from 'react'
import { XIcon } from '../../components/Icons'
import { sanitizeJournalHtml } from '../../utils/sanitizeJournalHtml'
import { formatShortDate } from '../../utils/formatDate'
import type { JournalEntry } from '../../types/journal'
import styles from '../JournalPage.module.css'

interface JournalReaderProps {
  entry: JournalEntry
  onClose: () => void
}

// Full entry in a dialog; Escape or the backdrop closes it
export const JournalReader = ({ entry, onClose }: JournalReaderProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="journal-reader-title">
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 id="journal-reader-title" className={styles.modalTitle}>{entry.title}</h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close" autoFocus>
            <XIcon size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalMeta}>{entry.author?.name || 'Partner'} · {formatShortDate(entry.createdAt)}</p>
          {entry.imageUrl && <img src={entry.imageUrl} alt="" className={styles.modalImage} />}
          <div className={styles.modalContent} dangerouslySetInnerHTML={{ __html: sanitizeJournalHtml(entry.content) }} />
        </div>
      </div>
    </div>
  )
}
