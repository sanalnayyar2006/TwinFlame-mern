import { useState, useEffect, useCallback } from 'react'
import { Navigation } from '../components/Navigation'
import { LoadMore } from '../components/LoadMore'
import { galleryService } from '../services/gallery.service'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { cloudinaryThumb, cloudinaryFit } from '../utils/cloudinaryImage'
import type { GalleryImage } from '../types/gallery'
import {
  PhotoIcon,
  PlusIcon,
  XIcon
} from '../components/Icons'
import styles from './GalleryPage.module.css'

export default function GalleryPage() {
  const photos = usePaginatedList<GalleryImage>(before => galleryService.list(before))
  const { items: images, setItems: setImages, setTotal } = photos
  const [showModal, setShowModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this photo?')) return
    try {
      await galleryService.remove(id)
      setImages(prev => prev.filter(i => i._id !== id))
      setTotal(t => t - 1)
      setSelectedImage(null)
    } catch (err) {
      setError((err as Error).message || 'Could not delete the photo. Please try again.')
    }
  }

  const handleEditCaption = async (id: string, caption: string) => {
    try {
      const updated = await galleryService.updateCaption(id, caption)
      const newCaption = updated.caption ?? caption
      setImages(prev => prev.map(i => i._id === id ? { ...i, caption: newCaption } : i))
      setSelectedImage(prev => prev && prev._id === id ? { ...prev, caption: newCaption } : prev)
    } catch (err) {
      setError((err as Error).message || 'Could not save the caption. Please try again.')
    }
  }

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!file) {
      setError('Choose a photo to upload first.')
      return
    }
    try {
      setUploading(true)
      setError(null)
      const photo = await galleryService.upload(file, caption.trim())
      setImages(prev => [photo, ...prev])
      setTotal(t => t + 1)
      setShowModal(false)
      setFile(null)
      setCaption('')
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Please try again.')
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
          {photos.loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p>Loading your photos...</p>
            </div>
          ) : photos.error ? (
            <div className={styles.errorAlert} role="alert">
              <span>Your photos didn't load. {photos.error}</span>
              <button onClick={photos.reload} className={styles.dismissBtn}>Try again</button>
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
                    src={cloudinaryThumb(image.imageUrl, 480)}
                    alt={image.caption || 'Shared memory'}
                    loading="lazy"
                    decoding="async"
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
          {!photos.loading && !photos.error && (
            <LoadMore
              hasMore={photos.hasMore}
              loading={photos.loadingMore}
              error={photos.loadMoreError}
              onLoadMore={() => void photos.loadMore()}
              shown={images.length}
              total={photos.total}
              noun="photos"
            />
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
                    maxLength={500}
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
                src={cloudinaryFit(selectedImage.imageUrl, 1600)}
                alt={selectedImage.caption || 'Photo preview'}
              />
              {selectedImage.caption && (
                <p className={styles.lightboxCaption}>{selectedImage.caption}</p>
              )}
              {selectedImage.author?.name && (
                <p className={styles.lightboxAuthor}>Uploaded by {selectedImage.author.name}</p>
              )}
              <div className={styles.lightboxActions}>
                <button type="button" onClick={() => {
                  const c = prompt('Edit caption', selectedImage.caption || '')
                  if (c !== null) handleEditCaption(selectedImage._id, c)
                }}>Edit caption</button>
                <button type="button" onClick={() => handleDelete(selectedImage._id)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}