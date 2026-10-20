import { useState, useEffect, useCallback } from 'react'
import { Navigation } from '../components/Navigation'
import {
  PhotoIcon,
  PlusIcon,
  XIcon
} from '../components/Icons'
import styles from './GalleryPage.module.css'

interface GalleryImage {
  _id: string
  imageUrl: string
  caption?: string
  createdAt: string
  author?: {
    _id: string
    name: string
  }
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [showModal, setShowModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setImages(data.images || [])
      } else {
        setError('Unable to load gallery photos.')
      }
    } catch {
      setError('Unable to connect to gallery service.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // Escape key listener for modals (R-32)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedImage) {
        setSelectedImage(null)
      } else if (showModal) {
        setShowModal(false)
      }
    }
  }, [selectedImage, showModal])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!file) return
    try {
      setUploading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('image', file)
      formData.append('caption', caption.trim())

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setImages(prev => [data, ...prev])
        setShowModal(false)
        setFile(null)
        setCaption('')
      } else {
        setError('Upload failed. Please check image format and size.')
      }
    } catch {
      setError('Error uploading image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.pageContainer}>
      <Navigation />

      <div className={styles.contentWrap}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <span className={styles.headerIcon}>
                <PhotoIcon size={24} />
              </span>
              <h1 className={styles.pageTitle}>Our Gallery</h1>
            </div>
            <p className={styles.pageSubtitle}>
              A shared album of our candid moments, dates, and memories.
            </p>
          </div>

          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => setShowModal(true)}
          >
            <PlusIcon size={18} />
            <span>Add Photo</span>
          </button>
        </header>

        {error && (
          <div className={styles.errorAlert} role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className={styles.dismissBtn}>Dismiss</button>
          </div>
        )}

        <main className={styles.main}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p>Loading your photos...</p>
            </div>
          ) : images.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <PhotoIcon size={32} />
              </div>
              <h2 className={styles.emptyTitle}>No photos yet</h2>
              <p className={styles.emptyDesc}>
                Start building your visual love story. Upload a picture from your favorite date,
                trip, or simple everyday moment together.
              </p>
              <button
                type="button"
                className={styles.emptyBtn}
                onClick={() => setShowModal(true)}
              >
                <PlusIcon size={18} />
                <span>Add first photo</span>
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {images.map(image => (
                <div
                  key={image._id}
                  className={styles.card}
                  onClick={() => setSelectedImage(image)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedImage(image)}
                  aria-label={image.caption ? `View photo: ${image.caption}` : 'View photo'}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.caption || 'Shared memory'}
                    loading="lazy"
                  />
                  {image.caption && (
                    <div className={styles.captionOverlay}>
                      <p className={styles.captionText}>{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Floating Upload Button for Mobile */}
        <button
          type="button"
          className={styles.fab}
          onClick={() => setShowModal(true)}
          aria-label="Add photo"
        >
          <PlusIcon size={24} />
        </button>

        {/* Upload Modal (R-32 Accessible Dialog) */}
        {showModal && (
          <div
            className={styles.modalBackdrop}
            onClick={() => setShowModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
          >
            <div
              className={styles.modalCard}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 id="upload-modal-title" className={styles.modalTitle}>Add a Photo</h2>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setShowModal(false)}
                  aria-label="Close upload modal"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <form onSubmit={handleUpload} className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label htmlFor="photo-file" className={styles.modalLabel}>Select Image</label>
                  <input
                    id="photo-file"
                    type="file"
                    accept="image/*"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className={styles.fileInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="photo-caption" className={styles.modalLabel}>Caption (Optional)</label>
                  <input
                    id="photo-caption"
                    type="text"
                    placeholder="Where was this taken?"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.modalSubmitBtn}
                    disabled={uploading || !file}
                  >
                    {uploading ? 'Uploading...' : 'Save Photo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox Modal (R-32 Accessible Dialog) */}
        {selectedImage && (
          <div
            className={styles.lightbox}
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
          >
            <button
              type="button"
              className={styles.lightboxCloseBtn}
              onClick={() => setSelectedImage(null)}
              aria-label="Close preview"
            >
              <XIcon size={24} />
            </button>
            <div
              className={styles.lightboxContent}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.caption || 'Photo preview'}
              />
              {selectedImage.caption && (
                <p className={styles.lightboxCaption}>{selectedImage.caption}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}