import { useEffect, useId, useRef, useState } from 'react'
import { LogoutIcon } from './Icons'
import styles from './SignOutControl.module.css'

interface SignOutControlProps {
  onConfirm: () => void
  busy: boolean
}

// Asks before signing out so a stray tap in the profile menu never logs anyone out
export const SignOutControl = ({ onConfirm, busy }: SignOutControlProps) => {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const promptId = useId()

  // Focus Cancel, not Sign out, so a quick double tap can't confirm by accident
  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

  if (!confirming) {
    return (
      <button type="button" className={styles.trigger} onClick={() => setConfirming(true)}>
        <LogoutIcon size={16} />
        <span>Sign out</span>
      </button>
    )
  }

  return (
    <div className={styles.confirm} role="group" aria-labelledby={promptId}>
      <p id={promptId} className={styles.prompt}>Sign out of TwinFlame on this device?</p>
      <div className={styles.actions}>
        <button
          ref={cancelRef}
          type="button"
          className={styles.cancel}
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.danger}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
