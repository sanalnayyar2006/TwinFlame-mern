import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useSignOut } from '../hooks/useSignOut'
import { SignOutControl } from './SignOutControl'
import {
  FlameIcon,
  HomeIcon,
  BookOpenIcon,
  PhotoIcon,
  CardsIcon,
  UserIcon,
  CopyIcon,
  CheckIcon
} from './Icons'
import styles from './Navigation.module.css'

interface UserData {
  _id?: string
  name?: string
  email?: string
  coupleCode?: string
  partnerId?: { name: string; _id: string } | null
}

interface NavigationProps {
  partnerName?: string | null
  user?: UserData | null
}

export const Navigation: React.FC<NavigationProps> = ({ partnerName: propPartnerName, user: propUser }) => {
  const navigate = useNavigate()
  // Pages that already load the user (Dashboard) pass it in; other pages let Navigation fetch it
  const [fetchedUser, setFetchedUser] = useState<UserData | null>(null)
  const user = propUser ?? fetchedUser
  const [showProfile, setShowProfile] = useState(false)
  const [copied, setCopied] = useState(false)
  // One ref per menu: desktop and mobile both render, so a shared ref only tracked the mobile one
  const desktopProfileRef = useRef<HTMLDivElement>(null)
  const mobileProfileRef = useRef<HTMLDivElement>(null)
  const { signOut, signingOut } = useSignOut()

  useEffect(() => {
    if (propUser !== undefined) return
    let cancelled = false
    api.get('/auth/me')
      .then(data => { if (!cancelled && data?.user) setFetchedUser(data.user) })
      .catch(() => { /* non-blocking: the menu shows a generic name */ })
    return () => { cancelled = true }
  }, [propUser])

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inside = [desktopProfileRef, mobileProfileRef].some(ref => ref.current?.contains(target))
      if (!inside) setShowProfile(false)
    }
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfile])

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showProfile) {
      setShowProfile(false)
    }
  }, [showProfile])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleCopyCode = () => {
    if (user?.coupleCode) {
      navigator.clipboard.writeText(user.coupleCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const effectivePartnerName = propPartnerName || user?.partnerId?.name || null
  const userName = user?.name || 'My Space'

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: HomeIcon },
    { to: '/journal', label: 'Journal', icon: BookOpenIcon },
    { to: '/gallery', label: 'Gallery', icon: PhotoIcon },
    { to: '/truth-dare', label: 'Truth or Dare', icon: CardsIcon },
  ]

  return (
    <>
      {/* Top Navbar for Laptop / Desktop screens */}
      <header className={styles.topNav}>
        <div className={styles.topNavInner}>
          {/* Brand - positioned firmly to the left */}
          <NavLink to="/dashboard" className={styles.brandLink}>
            <span className={styles.brandIcon}>
              <FlameIcon size={24} />
            </span>
            <span className={styles.brandName}>TwinFlame</span>
          </NavLink>

          {/* Centered Navigation Links */}
          <nav className={styles.navLinks} aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? `${styles.navLink} ${styles.navLinkActive}`
                      : styles.navLink
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* User & Profile Section on the Right */}
          <div className={styles.userSection}>
            {effectivePartnerName && (
              <div className={styles.statusBadge}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span className={styles.statusText}>With {effectivePartnerName}</span>
              </div>
            )}

            {/* Profile Dropdown Trigger */}
            <div className={styles.profileWrapper} ref={desktopProfileRef}>
              <button
                type="button"
                className={`${styles.profileBtn} ${showProfile ? styles.profileBtnActive : ''}`}
                onClick={() => setShowProfile(prev => !prev)}
                aria-expanded={showProfile}
                // Starts with the visible name so voice control ("click Ana") works (WCAG 2.5.3)
                aria-label={`${userName}, open profile menu`}
              >
                <div className={styles.profileIconWrap}>
                  <UserIcon size={18} />
                </div>
                <span className={styles.profileName}>{userName}</span>
              </button>

              {/* Profile Card Popover */}
              {showProfile && (
                <div className={styles.profilePopover} id="profile-panel-desktop" aria-label="Profile">
                  <div className={styles.popoverHeader}>
                    <div className={styles.popoverAvatar}>
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.popoverInfo}>
                      <h4 className={styles.popoverUserName}>{userName}</h4>
                      {user?.email && <p className={styles.popoverEmail}>{user.email}</p>}
                    </div>
                  </div>

                  <div className={styles.popoverDivider} />

                  {/* Couple Code quick access */}
                  <div className={styles.popoverCodeSection}>
                    <span className={styles.popoverLabel}>Your Couple Code</span>
                    <div className={styles.popoverCodeBox}>
                      <code className={styles.codeText}>{user?.coupleCode || '------'}</code>
                      <button
                        type="button"
                        className={styles.popoverCopyBtn}
                        onClick={handleCopyCode}
                        aria-label="Copy couple code"
                      >
                        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Partner Connection Status */}
                  <div className={styles.popoverStatusRow}>
                    <span className={styles.popoverLabel}>Partner Status</span>
                    {effectivePartnerName ? (
                      <span className={styles.popoverConnected}>
                        Connected with {effectivePartnerName}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.popoverLinkBtn}
                        onClick={() => {
                          setShowProfile(false)
                          navigate('/link-partner')
                        }}
                      >
                        Link Partner
                      </button>
                    )}
                  </div>

                  <div className={styles.popoverDivider} />

                  <SignOutControl onConfirm={signOut} busy={signingOut} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navbar for Mobile screens */}
      <nav className={styles.bottomNav} aria-label="Mobile Navigation">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? `${styles.bottomNavItem} ${styles.bottomNavItemActive}`
                  : styles.bottomNavItem
              }
            >
              <Icon size={20} />
              <span>{item.label === 'Truth or Dare' ? 'T & D' : item.label}</span>
            </NavLink>
          )
        })}

        {/* Mobile Profile / Logout */}
        <div className={styles.mobileProfileWrapper} ref={mobileProfileRef}>
          <button
            type="button"
            className={`${styles.bottomNavItem} ${showProfile ? styles.bottomNavItemActive : ''}`}
            onClick={() => setShowProfile(prev => !prev)}
            aria-expanded={showProfile}
            aria-label="Open profile menu"
          >
            <UserIcon size={20} />
            <span>Profile</span>
          </button>

          {showProfile && (
            <div className={styles.mobileProfilePopover} id="profile-panel-mobile" aria-label="Profile">
              <div className={styles.popoverHeader}>
                <div className={styles.popoverAvatar}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.popoverInfo}>
                  <h4 className={styles.popoverUserName}>{userName}</h4>
                  {user?.email && <p className={styles.popoverEmail}>{user.email}</p>}
                </div>
              </div>

              <div className={styles.popoverDivider} />

              <div className={styles.popoverCodeSection}>
                <span className={styles.popoverLabel}>Your Couple Code</span>
                <div className={styles.popoverCodeBox}>
                  <code className={styles.codeText}>{user?.coupleCode || '------'}</code>
                  <button
                    type="button"
                    className={styles.popoverCopyBtn}
                    onClick={handleCopyCode}
                    aria-label="Copy couple code"
                  >
                    {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.popoverStatusRow}>
                <span className={styles.popoverLabel}>Partner Status</span>
                {effectivePartnerName ? (
                  <span className={styles.popoverConnected}>
                    Connected with {effectivePartnerName}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.popoverLinkBtn}
                    onClick={() => {
                      setShowProfile(false)
                      navigate('/link-partner')
                    }}
                  >
                    Link Partner
                  </button>
                )}
              </div>

              <div className={styles.popoverDivider} />

              <SignOutControl onConfirm={signOut} busy={signingOut} />
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
