import { PhotoIcon } from '../../components/Icons'
import { sanitizeJournalHtml } from '../../utils/sanitizeJournalHtml'
import { formatShortDate } from '../../utils/formatDate'
import type { JournalEntry } from '../../types/journal'
import styles from '../JournalPage.module.css'

interface JournalEntryCardProps {
  entry: JournalEntry
  menuOpen: boolean
  photoBusy: boolean
  deleting: boolean
  onOpen: () => void
  onToggleMenu: () => void
  onAddPhoto: (file: File) => void
  onRemovePhotos: () => void
  onDelete: () => void
}

export const JournalEntryCard = ({
  entry, menuOpen, photoBusy, deleting, onOpen, onToggleMenu, onAddPhoto, onRemovePhotos, onDelete
}: JournalEntryCardProps) => {
  const hasPhoto = entry.content?.includes('<img')

  return (
    // The whole card opens on click; the title button is the keyboard and screen reader way in
    <article className={styles.entryCard} onClick={onOpen}>
      <div className={styles.entryHeader}>
        <div className={styles.entryMeta}>
          <span className={styles.authorBadge}>{entry.author?.name || 'Partner'}</span>
          <span className={styles.entryDate}>{formatShortDate(entry.createdAt)}</span>
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={e => { e.stopPropagation(); onToggleMenu() }}
          aria-label="More options"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className={styles.menuPopover} onClick={e => e.stopPropagation()}>
            <label className={styles.menuItem} aria-disabled={photoBusy}>
              {photoBusy ? 'Working…' : 'Add photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={photoBusy} onChange={e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) onAddPhoto(f)
              }} />
            </label>
            {hasPhoto && (
              <button className={styles.menuItem} disabled={photoBusy} onClick={onRemovePhotos}>Remove photo</button>
            )}
            <button className={styles.menuItem} disabled={deleting} onClick={onDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <h3 className={styles.entryTitle}>
        <button type="button" className={styles.entryTitleButton} onClick={e => { e.stopPropagation(); onOpen() }}>
          {entry.title}
        </button>
      </h3>
      {hasPhoto && (
        <span className={styles.imageBadge} title="includes image">
          <PhotoIcon size={14} />
        </span>
      )}
      <p className={styles.entryContent} dangerouslySetInnerHTML={{ __html: sanitizeJournalHtml(entry.content) }} />
    </article>
  )
}
