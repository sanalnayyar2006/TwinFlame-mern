import { useDemoLogin } from '../hooks/useDemoLogin'
import styles from './DemoEntry.module.css'

// For people trying the app without signing up. Shown only when VITE_DEMO_MODE=true.
export const DemoEntry = () => {
  const { enter, entering, error } = useDemoLogin()

  return (
    <section className={styles.demo} aria-labelledby="demo-heading">
      <h2 id="demo-heading" className={styles.heading}>Just looking around?</h2>
      <p className={styles.text}>
        Step into a sample couple. Open Ana here and Ben in a private window to watch them sync live.
        Anyone can use it, and it resets every day.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={() => void enter('ana')} disabled={entering !== null}>
          {entering === 'ana' ? 'Opening…' : 'Enter as Ana'}
        </button>
        <button type="button" className={styles.button} onClick={() => void enter('ben')} disabled={entering !== null}>
          {entering === 'ben' ? 'Opening…' : 'Enter as Ben'}
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  )
}
