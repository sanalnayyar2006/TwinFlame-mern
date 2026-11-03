import type { FormEvent, RefObject } from 'react'
import styles from '../JournalPage.module.css'

interface JournalEditorProps {
  title: string
  onTitleChange: (title: string) => void
  editorRef: RefObject<HTMLDivElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  hasPhotos: boolean
  uploading: boolean
  submitting: boolean
  canSubmit: boolean
  isDraftMode: boolean
  onEditorBlur: () => void
  // Called as the photo picker opens, so the page can remember where the cursor was
  onPhotoPickerOpen: () => void
  onPickPhoto: (file: File) => void
  onRemovePhotos: () => void
  onDeleteDraft: () => void
  onCancel: () => void
  onSubmit: (e: FormEvent) => void
}

export const JournalEditor = ({
  title, onTitleChange, editorRef, fileInputRef, hasPhotos, uploading, submitting, canSubmit,
  isDraftMode, onEditorBlur, onPhotoPickerOpen, onPickPhoto, onRemovePhotos, onDeleteDraft, onCancel, onSubmit
}: JournalEditorProps) => (
  <form className={styles.writeForm} onSubmit={onSubmit}>
    <div className={styles.inputGroup}>
      <label htmlFor="journal-title" className={styles.label}>Title</label>
      <input
        id="journal-title"
        className={styles.input}
        type="text"
        placeholder="Give this moment a title..."
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        autoFocus
      />
    </div>

    <div className={styles.inputGroup}>
      <span id="journal-content-label" className={styles.label}>Your Thoughts</span>
      {/* contentEditable needs an explicit role and label; a <label> can't name a div */}
      <div
        ref={editorRef}
        id="journal-content"
        role="textbox"
        aria-multiline="true"
        aria-labelledby="journal-content-label"
        tabIndex={0}
        className={styles.textarea}
        contentEditable
        suppressContentEditableWarning
        onBlur={onEditorBlur}
        style={{ minHeight: 200, padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={uploading}
        aria-label="Add a photo to this entry"
        onClick={onPhotoPickerOpen}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onPickPhoto(f)
        }}
      />
      {uploading && <p className={styles.label} role="status">Uploading photo…</p>}
      {hasPhotos && (
        <button type="button" className={styles.removePhotoBtn} onClick={onRemovePhotos}>Remove photo</button>
      )}
    </div>

    <div className={styles.formActions}>
      {isDraftMode && (
        <button type="button" className={styles.cancelBtn} onClick={onDeleteDraft}>Delete Draft</button>
      )}
      <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
        {submitting ? 'Saving memory...' : 'Save to Journal'}
      </button>
    </div>
  </form>
)
