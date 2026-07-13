'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    if (typeof window !== 'undefined' && window.localStorage.getItem('pwa-install-dismissed')) {
      return
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const nav = window.navigator as any
    if (isStandalone || nav.standalone) {
      return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      // iOS doesn't support beforeinstallprompt, we just show the banner directly
      setShowPrompt(true)
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pwa-install-dismissed', '1')
    }
  }

  if (!showPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)',
      maxWidth: '400px',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-lg)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.25rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>Install Leaders ERP</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {isIOS 
              ? 'To install this app on your iOS device, tap the share button and select "Add to Home Screen".' 
              : 'Install our app on your device for quick and easy access.'}
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="btn btn-ghost btn-icon"
          style={{ margin: '-0.5rem -0.5rem 0 0' }}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!isIOS && deferredPrompt && (
          <button onClick={handleInstall} className="btn btn-primary" style={{ flex: 1 }}>
            <Download size={16} /> Install App
          </button>
        )}
        {isIOS && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Share size={16} /> Tap Share &rarr; Add to Home Screen
          </div>
        )}
      </div>
    </div>
  )
}
