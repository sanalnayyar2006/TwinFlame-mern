import { useState, useEffect, useRef } from 'react'
import { journalService } from '../services/journal.service'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useJournalDraft } from '../hooks/useJournalDraft'
import { Navigation } from '../components/Navigation'
import { LoadMore } from '../components/LoadMore'
import { JournalEntryCard } from './journal/JournalEntryCard'
import { JournalReader } from './journal/JournalReader'
import { JournalEditor } from './journal/JournalEditor'
import type { JournalEntry } from '../types/journal'
import {
  BookOpenIcon,
  PlusIcon,
  ArrowLeftIcon
} from '../components/Icons'
import styles from './JournalPage.module.css'

const JournalPage = () => {
  const [view, setView] = useState<'list' | 'write'>('list')
  const feed = usePaginatedList<JournalEntry>(before => journalService.list(before))
  const { items: entries, setItems: setEntries, setTotal } = feed
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Entry whose card-menu photo is uploading or being removed
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null)
  const [editorUploading, setEditorUploading] = useState(false)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const draft = useJournalDraft()
  const hasDraft = draft.hasDraft
  const [isDraftMode, setIsDraftMode] = useState(false)

  // Autosave to this device while writing
  const saveDraft = draft.save
  useEffect(() => {
    if (view === 'write') saveDraft(title, content)
  }, [title, content, view, saveDraft])

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
       const entry = await journalService.create(title.trim(), html)
      if (entry) {
         setEntries(prev => [entry, ...prev])
         setTotal(t => t + 1)
         setTitle('')
         setContent('')
         if (editorRef.current) editorRef.current.innerHTML = ''
         if (isDraftMode) draft.clear()
         setIsDraftMode(false)
         setView('list')
      }
    } catch (err) {
      setError((err as Error).message || 'Could not save your entry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this journal entry?')) return
    try {
      setDeletingId(id)
      await journalService.remove(id)
       setEntries(prev => prev.filter(e => e._id !== id))
       setTotal(t => t - 1)
       setViewingEntry(prev => (prev?._id === id ? null : prev))
    } catch (err) {
      setError((err as Error).message || 'Failed to delete entry.')
    } finally {
      setDeletingId(null)
    }
  }

  const replaceEntry = (updated: JournalEntry) =>
    setEntries(prev => prev.map(en => (en._id === updated._id ? { ...en, content: updated.content } : en)))

  // Card menu: upload a photo, then append it to the saved entry
  const addPhotoToEntry = async (entry: JournalEntry, file: File) => {
    setPhotoBusyId(entry._id)
    setError(null)
    try {
      const url = await journalService.uploadImage(file)
      replaceEntry(await journalService.updateContent(entry._id, `${entry.content}<img src="${url}">`))
      setMenuOpenId(null)
    } catch (err) {
      setError((err as Error).message || 'Could not add the photo. Please try again.')
    } finally {
      setPhotoBusyId(null)
    }
  }

  // Card menu: the server also deletes the removed photos from storage
  const removePhotosFromEntry = async (entry: JournalEntry) => {
    setPhotoBusyId(entry._id)
    setError(null)
    try {
      replaceEntry(await journalService.updateContent(entry._id, entry.content.replace(/<img[^>]*>/g, '')))
      setMenuOpenId(null)
    } catch (err) {
      setError((err as Error).message || 'Could not remove the photo. Please try again.')
    } finally {
      setPhotoBusyId(null)
    }
  }

  // Editor: upload first, then insert the hosted URL at the saved cursor position
  const insertPhotoInEditor = async (file: File) => {
    setEditorUploading(true)
    setError(null)
    try {
      const url = await journalService.uploadImage(file)
      if (!editorRef.current) return
      editorRef.current.focus()
      const sel = window.getSelection()
      sel?.removeAllRanges()
      if (savedRangeRef.current) sel?.addRange(savedRangeRef.current)
      const img = document.createElement('img')
      img.src = url
      img.alt = ''
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
      setContent(editorRef.current.innerHTML)
    } catch (err) {
      setError((err as Error).message || 'Could not upload the photo. Please try again.')
    } finally {
      setEditorUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
                    const saved = draft.read()
                    if (saved) {
                      setTitle(saved.title)
                      setContent(saved.content)
                      setIsDraftMode(true)
                    }
                    setView('write')
                    // The editor mounts on the next render; fill it then
                    setTimeout(() => {
                      if (editorRef.current && saved?.content) editorRef.current.innerHTML = saved.content
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
            {feed.loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>Loading your journal...</p>
              </div>
            ) : feed.error ? (
              <div className={styles.errorAlert} role="alert">
                <span>Your journal didn't load. {feed.error}</span>
                <button onClick={feed.reload} className={styles.dismissBtn}>Try again</button>
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
                  <JournalEntryCard
                    key={entry._id}
                    entry={entry}
                    menuOpen={menuOpenId === entry._id}
                    photoBusy={photoBusyId === entry._id}
                    deleting={deletingId === entry._id}
                    onOpen={() => setViewingEntry(entry)}
                    onToggleMenu={() => setMenuOpenId(menuOpenId === entry._id ? null : entry._id)}
                    onAddPhoto={f => void addPhotoToEntry(entry, f)}
                    onRemovePhotos={() => void removePhotosFromEntry(entry)}
                    onDelete={() => void handleDelete(entry._id)}
                  />
                ))}
              </div>
            )}
            {!feed.loading && !feed.error && (
              <LoadMore
                hasMore={feed.hasMore}
                loading={feed.loadingMore}
                error={feed.loadMoreError}
                onLoadMore={() => void feed.loadMore()}
                shown={entries.length}
                total={feed.total}
                noun="entries"
              />
            )}
          </main>
        )}

        {/* Write View */}
        {view === 'write' && (
          <main className={styles.main}>
            <JournalEditor
              title={title}
              onTitleChange={setTitle}
              editorRef={editorRef}
              fileInputRef={fileInputRef}
              hasPhotos={content.includes('<img')}
              uploading={editorUploading}
              submitting={submitting}
              canSubmit={!submitting && !editorUploading && !!title.trim() && !!content.trim()}
              isDraftMode={isDraftMode}
              onEditorBlur={() => {
                const html = editorRef.current?.innerHTML || ''
                setContent(html)
                if (html.trim() && (isDraftMode || !hasDraft)) draft.save(title, html)
              }}
              onPhotoPickerOpen={() => {
                // Remember the cursor so the photo lands where the user was typing
                const sel = window.getSelection()
                if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
              }}
              onPickPhoto={f => void insertPhotoInEditor(f)}
              onRemovePhotos={() => {
                if (editorRef.current) {
                  editorRef.current.innerHTML = editorRef.current.innerHTML.replace(/<img[^>]*>/g, '')
                  setContent(editorRef.current.innerHTML)
                }
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              onDeleteDraft={() => {
                draft.clear()
                setTitle('')
                setContent('')
                setIsDraftMode(false)
                setView('list')
              }}
              onCancel={() => {
                draft.save(title, editorRef.current?.innerHTML || '')
                if (editorRef.current) editorRef.current.innerHTML = ''
                setView('list')
              }}
              onSubmit={handleCreate}
            />
          </main>
        )}
      </div>

      {viewingEntry && <JournalReader entry={viewingEntry} onClose={() => setViewingEntry(null)} />}
    </div>
  )
}

export default JournalPage