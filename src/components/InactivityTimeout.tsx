'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function InactivityTimeout() {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(300) // 5 minutes warning countdown
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // 25 minutes of inactivity before warning (in ms)
  const INACTIVITY_LIMIT = 25 * 60 * 1000 
  // 5 minutes warning countdown before logout (in ms)
  const WARNING_LIMIT = 5 * 60 * 1000 



  const logoutUser = async () => {
    try {
      await fetch('/auth/signout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (e) {
      window.location.href = '/login'
    }
  }

  const resetTimers = () => {
    setShowWarning(false)
    setSecondsRemaining(300)
    
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    // Set warning timer (after 25 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      // Start countdown of 5 minutes
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!)
            logoutUser()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_LIMIT)

    // Set logout timer (after 30 minutes total)
    logoutTimerRef.current = setTimeout(() => {
      logoutUser()
    }, INACTIVITY_LIMIT + WARNING_LIMIT)
  }

  useEffect(() => {
    // Events that reset the inactivity timer
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers()
      }
    }

    // Initialize timers
    resetTimers()

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      // Cleanup timers and listeners
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [showWarning])

  if (!showWarning) return null

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div className="glass-panel" style={{
        padding: '2.5rem', width: '90%', maxWidth: '420px',
        textAlign: 'center', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-warning)' }}>
          Inactivity Warning
        </h2>
        <p style={{ fontSize: '0.95rem', marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
          You have been inactive for a while. You will be automatically logged out in:
        </p>
        <div style={{
          fontSize: '2.5rem', fontWeight: 700, margin: '1rem 0',
          color: 'var(--color-primary)'
        }}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
        <button
          onClick={() => {
            resetTimers()
          }}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
        >
          Keep Me Logged In
        </button>
      </div>
    </div>
  )
}
