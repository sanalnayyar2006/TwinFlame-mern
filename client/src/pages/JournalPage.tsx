import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Navigation } from '../components/Navigation'
import {
  BookOpenIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  XIcon
} from '../components/Icons'
import styles from './JournalPage.module.css'

interface Author {
  _id: string
  name: string
}

interface JournalEntry {
  _id: string
  title: string
  content: string
  author: Author
  createdAt: string
}

const JournalPage = () => {
  const [view, setView] = useState<'list' | 'write'>('list')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get('/journal')
      if (data && data.entries) {
        setEntries(data.entries)
      }
    } catch {
      setError('Unable to load entries. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Please add both a title and some thoughts.')
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      const data = await api.post('/journal', {
        title: title.trim(),
        content: content.trim()
      })
      if (data && data.entry) {
        setEntries(prev => [data.entry, ...prev])
        setTitle('')
        setContent('')
        setView('list')
      }
    } catch {
      setError('Could not save your entry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this journal entry?')) return
    try {
      setDeletingId(id)
      await api.delete(`/journal/${id}`)
      setEntries(prev => prev.filter(e => e._id !== id))
    } catch {
      alert('Failed to delete entry.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className={styles.pageContainer}>
      <Navigation />

      <div className={styles.contentWrap}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {view === 'write' && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setView('list')}
                aria-label="Back to journal list"
              >
                <ArrowLeftIcon size={20} />
              </button>
            )}
            <div>
              <h1 className={styles.pageTitle}>
                {view === 'list' ? 'Shared Journal' : 'New Journal Entry'}
              </h1>
              <p className={styles.pageSubtitle}>
                {view === 'list'
                  ? 'Private reflections, thoughts, and memories written for each other.'
                  : 'Capture what is on your heart right now.'}
              </p>
            </div>
          </div>

          {view === 'list' && (
            <button
              type="button"
              className={styles.writeBtn}
              onClick={() => setView('write')}
            >
              <PlusIcon size={18} />
              <span>Write Entry</span>
            </button>
          )}
        </header>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className={styles.dismissBtn}>Dismiss</button>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <main className={styles.main}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>Loading your journal...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrap}>
                  <BookOpenIcon size={32} />
                </div>
                <h2 className={styles.emptyTitle}>No entries yet</h2>
                <p className={styles.emptyDesc}>
                  Your journal is completely private between you and your partner.
                  Write down your first memory or gratitude today.
                </p>
                <button
                  type="button"
                  className={styles.emptyBtn}
                  onClick={() => setView('write')}
                >
                  <PlusIcon size={18} />
                  <span>Write first entry</span>
                </button>
              </div>
            ) : (
              <div className={styles.entriesGrid}>
                {entries.map(entry => (
                  <article
                  key={entry._id}
                  className={styles.entryCard}
                  onClick={() => setViewingEntry(entry)}
                >
                    <div className={styles.entryHeader}>
                      <div className={styles.entryMeta}>
                        <span className={styles.authorBadge}>{entry.author?.name || 'Partner'}</span>
                        <span className={styles.entryDate}>{formatDate(entry.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(entry._id)}
                        disabled={deletingId === entry._id}
                        aria-label={`Delete entry ${entry.title}`}
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>

                    <h3 className={styles.entryTitle}>{entry.title}</h3>
                    <p className={styles.entryContent}>{entry.content}</p>
                  </article>
                ))}
              </div>
            )}
          </main>
        )}

        {/* Write View */}
        {view === 'write' && (
          <main className={styles.main}>
            <form className={styles.writeForm} onSubmit={handleCreate}>
              <div className={styles.inputGroup}>
                <label htmlFor="journal-title" className={styles.label}>Title</label>
                <input
                  id="journal-title"
                  className={styles.input}
                  type="text"
                  placeholder="Give this moment a title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="journal-content" className={styles.label}>Your Thoughts</label>
                <textarea
                  id="journal-content"
                  className={styles.textarea}
                  placeholder="Write freely... only you and your partner will see this."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setView('list')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting || !title.trim() || !content.trim()}
                >
                  {submitting ? 'Saving memory...' : 'Save to Journal'}
                </button>
              </div>
            </form>
          </main>
        )}
      </div>

      {/* Read Modal */}
      {viewingEntry && (
        <div className={styles.modalBackdrop} onClick={() => setViewingEntry(null)} role="dialog" aria-modal="true">
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{viewingEntry.title}</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setViewingEntry(null)} aria-label="Close"><XIcon size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalMeta}>{viewingEntry.author?.name || 'Partner'} · {formatDate(viewingEntry.createdAt)}</p>
              <p className={styles.modalContent}>{viewingEntry.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JournalPage