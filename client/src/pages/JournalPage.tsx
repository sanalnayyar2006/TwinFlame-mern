import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    const data = await api.get('/journal')
    if (data.entries) {
      setEntries(data.entries)
    }
  }

  const handleCreate = async () => {
    if (!title || !content) {
      setError('Please fill in all fields')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await api.post('/journal', { title, content })
      if (data.entry) {
        setEntries(prev => [data.entry, ...prev])
        setTitle('')
        setContent('')
        setView('list')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/journal/${id}`)
    setEntries(prev => prev.filter(e => e._id !== id))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className={styles.container}>

      {/* Header */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => view === 'write' ? setView('list') : navigate('/dashboard')}
        >
          ←
        </button>
        <h2 className={styles.brand}>
          {view === 'list' ? 'Our Journal' : 'New Entry'}
        </h2>
        {view === 'list' && (
          <button
            className={styles.writeBtn}
            onClick={() => setView('write')}
          >
            + Write
          </button>
        )}
      </header>

      {/* List View */}
      {view === 'list' && (
        <main className={styles.main}>
          {entries.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyIcon}>📖</p>
              <p className={styles.emptyText}>No entries yet.</p>
              <p className={styles.emptySubtext}>Write your first memory together.</p>
              <button
                className={styles.emptyBtn}
                onClick={() => setView('write')}
              >
                Write first entry
              </button>
            </div>
          ) : (
            <div className={styles.entries}>
              {entries.map(entry => (
                <div key={entry._id} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <div>
                      <h3 className={styles.entryTitle}>{entry.title}</h3>
                      <p className={styles.entryMeta}>
                        {entry.author.name} · {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(entry._id)}
                    >
                      🗑
                    </button>
                  </div>
                  <p className={styles.entryContent}>{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Write View */}
      {view === 'write' && (
        <main className={styles.main}>
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Give this memory a title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Your thoughts</label>
              <textarea
                className={styles.textarea}
                placeholder="Write about this moment..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={10}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.submitBtn}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </main>
      )}

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <button className={styles.navItem} onClick={() => navigate('/dashboard')}>
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className={`${styles.navItem} ${styles.navActive}`}>
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

export default JournalPage