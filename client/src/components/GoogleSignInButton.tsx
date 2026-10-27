import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GoogleIcon } from './Icons'
import styles from './GoogleSignInButton.module.css'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: string | number
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

export interface GoogleAuthResponse {
  token?: string
  user?: {
    id: string
    name: string
    coupleCode: string
    coupleId?: string | null
    partnerId?: string | null
    isNewUser?: boolean
  }
  message?: string
}

interface GoogleSignInButtonProps {
  text?: 'signin' | 'signup'
  onSuccess: (data: GoogleAuthResponse) => void
  onError: (errorMsg: string) => void
  disabled?: boolean
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  text = 'signin',
  onSuccess,
  onError,
  disabled = false
}) => {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [isOfficialButtonRendered, setIsOfficialButtonRendered] = useState(false)

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
  const isPlaceholderId = !clientId || clientId.includes('your-google-client-id')

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        setLoading(true)
        const API_URL = import.meta.env.DEV
          ? ''
          : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')

        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ credential: response.credential })
        })

        const rawText = await res.text()
        let data: GoogleAuthResponse = {}
        try {
          data = rawText ? JSON.parse(rawText) : {}
        } catch {
          data = { message: rawText }
        }

        if (!res.ok) {
          onError(data.message || 'Google authentication failed')
          return
        }

        onSuccess(data)
      } catch (err) {
        console.error('Google auth error:', err)
        onError('Unable to connect to authentication server')
      } finally {
        setLoading(false)
      }
    },
    [onError, onSuccess]
  )

  useEffect(() => {
    if (isPlaceholderId) return

    const tryInit = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse
        })

        buttonRef.current.innerHTML = ''
        const containerWidth = buttonRef.current.offsetWidth || 380
        const buttonWidth = Math.min(Math.max(containerWidth, 200), 400)

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: buttonWidth,
          text: 'continue_with',
          shape: 'rectangular'
        })

        // Check if Google GSI rendered an iframe or button inside buttonRef
        setTimeout(() => {
          if (buttonRef.current && buttonRef.current.children.length > 0) {
            setIsOfficialButtonRendered(true)
          }
        }, 300)
      }
    }

    if (window.google?.accounts?.id) {
      tryInit()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          tryInit()
        }
      }, 150)
      return () => clearInterval(interval)
    }
  }, [clientId, isPlaceholderId, handleCredentialResponse])

  const handleCustomClick = () => {
    if (disabled || loading) return

    if (isPlaceholderId) {
      onError('Please set your real VITE_GOOGLE_CLIENT_ID from Google Cloud Console in client/.env')
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    } else {
      onError('Google Identity Services is still loading. Please check your internet connection.')
    }
  }

  const label = text === 'signup' ? 'Sign up with Google' : 'Continue with Google'

  return (
    <div className={styles.container}>
      <div className={styles.divider}>
        <span>or</span>
      </div>

      {/* Official GSI rendered button (visible if Google successfully injected the iframe) */}
      <div
        ref={buttonRef}
        className={styles.googleBtnWrapper}
        style={{ display: isOfficialButtonRendered && !loading ? 'flex' : 'none' }}
      />

      {/* Always-visible styled TwinFlame button (shown whenever official iframe hasn't rendered or is loading) */}
      {(!isOfficialButtonRendered || loading) && (
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={disabled || loading}
          className={styles.customGoogleBtn}
        >
          <GoogleIcon size={18} />
          <span>{loading ? 'Connecting to Google...' : label}</span>
        </button>
      )}
    </div>
  )
}
