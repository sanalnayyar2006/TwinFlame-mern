import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { Navigation } from '../components/Navigation'
import {
  BookOpenIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  XIcon,
  PhotoIcon
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
  imageUrl?: string
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
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const draftKey = 'journalDraft_' + (localStorage.getItem('token') || 'anon')
  const [hasDraft, setHasDraft] = useState(false)
  const [isDraftMode, setIsDraftMode] = useState(false)

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

  useEffect(() => {
    const draft = localStorage.getItem(draftKey)
    if (draft) {
      try {
        JSON.parse(draft)
        setHasDraft(true)
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (view === 'write' && (title.trim() || content.trim())) {
      localStorage.setItem(draftKey, JSON.stringify({ title, content }))
      setHasDraft(true)
    }
  }, [title, content, view])

  useEffect(() => {
    return () => {
      if (view === 'write' && (title.trim() || content.trim())) {
        localStorage.setItem(draftKey, JSON.stringify({ title, content }))
      }
    }
  }, [view, title, content])

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
     const html = editorRef.current?.innerHTML || content
     if (!title.trim() || !html.trim()) {
       setError('Please add both a title and some thoughts.')
       return
     }
     try {
       setSubmitting(true)
       setError(null)
       const data = await api.post('/journal', {
         title: title.trim(),
         content: html
       })
      if (data && data.entry) {
         setEntries(prev => [data.entry, ...prev])
         setTitle('')
         setContent('')
         if (editorRef.current) editorRef.current.innerHTML = ''
         if (isDraftMode) {
           localStorage.removeItem(draftKey)
           setHasDraft(false)
         }
         setIsDraftMode(false)
         setView('list')
      }
    } catch (err) {
      console.error('Save failed:', err)
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
       setViewingEntry(prev => (prev?._id === id ? null : prev))
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
                {view === 'list' ? 'Shared Journal' : (isDraftMode ? 'Complete the draft' : 'New Journal Entry')}
              </h1>
              <p className={styles.pageSubtitle}>
                {view === 'list'
                  ? 'Private reflections, thoughts, and memories written for each other.'
                  : 'Capture what is on your heart right now.'}
              </p>
            </div>
          </div>

          {view === 'list' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {hasDraft && (
                <button
                  type="button"
                  className={styles.writeBtn}
                  onClick={() => {
                    const draft = localStorage.getItem(draftKey)
                    if (draft) {
                      try {
                        const { title: t, content: c } = JSON.parse(draft)
                        if (t) setTitle(t)
                        if (c) setContent(c)
                        setIsDraftMode(true)
                      } catch { /* ignore */ }
                    }
                    setView('write')
                    setTimeout(() => {
                      if (editorRef.current) {
                        const draft = localStorage.getItem(draftKey)
                        if (draft) {
                          try {
                            const { content: c } = JSON.parse(draft)
                            if (c) editorRef.current.innerHTML = c
                          } catch { /* ignore */ }
                        }
                      }
                    }, 0)
                  }}
                >
                  <BookOpenIcon size={18} />
                  <span>Drafts{hasDraft ? ' (1)' : ''}</span>
                </button>
              )}
              <button
                type="button"
                className={styles.writeBtn}
                onClick={() => { setTitle(''); setContent(''); setIsDraftMode(false); setView('write') }}
              >
                <PlusIcon size={18} />
                <span>Write Entry</span>
              </button>
            </div>
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
                  <h2 className={styles.emptyTitle}>No journal entries</h2>
                  <p className={styles.emptyDesc}>
                    Create some lifelong memory for you to look over after you get older.
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
                        className={styles.menuBtn}
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === entry._id ? null : entry._id) }}
                        aria-label="More options"
                      >
                        ⋯
                      </button>
                      {menuOpenId === entry._id && (
                        <div className={styles.menuPopover} onClick={e => e.stopPropagation()}>
                          <label className={styles.menuItem}>
                            Add photo
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (!f) return
                              const r = new FileReader()
                              r.onload = async () => {
                                const newContent = entry.content + `<img src="${r.result}" />`
                                await api.patch(`/journal/${entry._id}`, { content: newContent })
                                setEntries(prev => prev.map(en => en._id === entry._id ? { ...en, content: newContent } : en))
                                setMenuOpenId(null)
                              }
                              r.readAsDataURL(f)
                            }} />
                          </label>
                          {entry.content?.includes('<img') && (
                            <button className={styles.menuItem} onClick={async () => {
                              const stripped = entry.content.replace(/<img[^>]*>/g, '')
                              await api.patch(`/journal/${entry._id}`, { content: stripped })
                              setEntries(prev => prev.map(en => en._id === entry._id ? { ...en, content: stripped } : en))
                              setMenuOpenId(null)
                            }}>Remove photo</button>
                          )}
                          <button className={styles.menuItem} onClick={(e) => { e.stopPropagation(); handleDelete(entry._id) }}>Delete</button>
                        </div>
                      )}
                    </div>

                    <h3 className={styles.entryTitle}>{entry.title}</h3>
                    {entry.content?.includes('<img') && (
                      <span className={styles.imageBadge} title="includes image">
                        <PhotoIcon size={14} />
                      </span>
                    )}
                    <p className={styles.entryContent} dangerouslySetInnerHTML={{ __html: entry.content }} />
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
                <div
                  ref={editorRef}
                  id="journal-content"
                  className={styles.textarea}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={() => {
                    const html = editorRef.current?.innerHTML || ''
                    setContent(html)
                    if (html.trim() && (isDraftMode || !hasDraft)) {
                      localStorage.setItem(draftKey, JSON.stringify({ title, content: html }))
                      setHasDraft(true)
                    }
                  }}
                  style={{ minHeight: 200, padding: 12, border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 8 }}
                />
                <input ref={fileInputRef} type="file" accept="image/*" onClick={() => {
                  const sel = window.getSelection()
                  if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
                }} onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const r = new FileReader()
                  r.onload = () => {
                    if (editorRef.current) {
                      editorRef.current.focus()
                      const sel = window.getSelection()
                      sel?.removeAllRanges()
                      if (savedRangeRef.current) sel?.addRange(savedRangeRef.current)
                      const img = document.createElement('img')
                      img.src = r.result as string
                      img.style.maxWidth = '100%'
                      if (savedRangeRef.current) {
                        savedRangeRef.current.deleteContents()
                        savedRangeRef.current.insertNode(img)
                        // move cursor after image
                        const range = document.createRange()
                        range.setStartAfter(img)
                        range.collapse(true)
                        sel?.removeAllRanges()
                        sel?.addRange(range)
                        savedRangeRef.current = range
                      } else {
                        editorRef.current.appendChild(img)
                      }
                      const html = editorRef.current.innerHTML
                      setContent(html)
                    }
                  }
                  r.readAsDataURL(f)
                }} />
                {content.includes('<img') && (
                  <button type="button" className={styles.removePhotoBtn} onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = editorRef.current.innerHTML.replace(/<img[^>]*>/g, '')
                      setContent(editorRef.current.innerHTML)
                    }
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}>Remove photo</button>
                )}
              </div>

              <div className={styles.formActions}>
                {isDraftMode && (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => {
                      localStorage.removeItem(draftKey)
                      setTitle('')
                      setContent('')
                      setHasDraft(false)
                      setIsDraftMode(false)
                      setView('list')
                    }}
                  >
                    Delete Draft
                  </button>
                )}
                <button
                  type="button"
                  className={styles.cancelBtn}
                onClick={() => {
                  const html = editorRef.current?.innerHTML || ''
                  if (html.trim() || title.trim()) {
                    localStorage.setItem(draftKey, JSON.stringify({ title, content: html }))
                    setHasDraft(true)
                  }
                  if (editorRef.current) editorRef.current.innerHTML = ''
                  setView('list')
                }}
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
              {viewingEntry.imageUrl && <img src={viewingEntry.imageUrl} alt="" className={styles.modalImage} />}
              <div className={styles.modalContent} dangerouslySetInnerHTML={{ __html: viewingEntry.content }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JournalPage