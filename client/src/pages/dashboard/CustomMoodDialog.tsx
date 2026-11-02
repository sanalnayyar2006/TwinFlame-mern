import { useEffect, useState } from 'react'
import { XIcon } from '../../components/Icons'
import styles from '../DashboardPage.module.css'

const COLORS = [
  { value: '#d4637f', name: 'Rose' },
  { value: '#e07a5f', name: 'Coral' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#10b981', name: 'Green' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#8b5cf6', name: 'Violet' }
]

interface CustomMoodDialogProps {
  onSave: (mood: string) => void
  onClose: () => void
}

export const CustomMoodDialog = ({ onSave, onClose }: CustomMoodDialogProps) => {
  const [text, setText] = useState('')
  const [color, setColor] = useState(COLORS[0].value)

  // Escape closes the dialog (R-32)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    if (!text.trim()) return
    onSave(`${text.trim()}||${color}`)
    onClose()
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="custom-mood-title">
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 id="custom-mood-title" className={styles.modalTitle}>Set Custom Mood</h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close modal">
            <XIcon size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <label htmlFor="custom-mood-input" className={styles.modalLabel}>How are you feeling?</label>
          <input
            id="custom-mood-input"
            type="text"
            autoFocus
            placeholder="e.g. Hopeful, Grateful, Excited"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            maxLength={24}
            className={styles.modalInput}
          />

          <span className={styles.modalLabel} id="custom-mood-color">Color Accent</span>
          <div className={styles.colorPalette} role="group" aria-labelledby="custom-mood-color">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                className={`${styles.colorChip} ${color === c.value ? styles.colorChipSelected : ''}`}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                aria-pressed={color === c.value}
              />
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.modalSaveBtn} onClick={save} disabled={!text.trim()}>Save Mood</button>
        </div>
      </div>
    </div>
  )
}
