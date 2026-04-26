import { useState, useEffect } from 'react'
import styles from './GalleryPage.module.css'

interface GalleryImage {
  _id: string
  imageUrl: string
  caption: string
  createdAt: string
  author: {
    _id: string
    name: string
  }
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [showModal, setShowModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setImages(data.images)
    }
    fetchImages()
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('image', file)
    formData.append('caption', caption)

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    setImages(prev => [data, ...prev])
    setShowModal(false)
    setFile(null)
    setCaption('')
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Our Gallery</h1>
      </div>

      {/* Photo Grid */}
      <div className={styles.grid}>
        {images.map(image => (
          <div
            key={image._id}
            className={styles.card}
            onClick={() => setSelectedImage(image)}
          >
            <img src={image.imageUrl} alt={image.caption} />
            {image.caption && <p>{image.caption}</p>}
          </div>
        ))}
      </div>

      {/* Floating Upload Button */}
      <button
        className={styles.fab}
        onClick={() => setShowModal(true)}
      >
        +
      </button>

      {/* Upload Modal */}
      {showModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Add Photo</h2>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <button onClick={handleUpload} disabled={loading}>
              {loading ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div className={styles.lightbox} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage.imageUrl} alt={selectedImage.caption} />
          {selectedImage.caption && <p>{selectedImage.caption}</p>}
        </div>
      )}
    </div>
  )
}