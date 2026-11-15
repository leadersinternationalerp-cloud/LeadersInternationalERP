'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  WING_COOKIE_NAME,
  inferWing,
  type SchoolWing,
  type UserWingAssignment,
  type WingFilterValue,
} from '@/lib/wing'

export function readWingCookieClient(): WingFilterValue {
  if (typeof document === 'undefined') return 'all'
  const match = document.cookie.match(new RegExp('(?:^|; )' + WING_COOKIE_NAME + '=([^;]*)'))
  if (!match) return 'all'
  const val = decodeURIComponent(match[1]).toLowerCase().trim()
  if (val === 'cambridge') return 'Cambridge'
  if (val === 'necta') return 'NECTA'
  return 'all'
}

export function writeWingCookieClient(value: WingFilterValue) {
  if (typeof document === 'undefined') return
  document.cookie = `${WING_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('lis-wing-change', { detail: { wing: value } }))
}

/**
 * React hook that synchronizes a page/table's wing filter with the Global Wing Switcher
 * in the top header bar, while enforcing locked wings for Cambridge-only or NECTA-only users.
 */
export type UseWingFilterReturn = [
  WingFilterValue,
  (next: WingFilterValue) => void,
  boolean
] & {
  wingFilter: WingFilterValue
  setWingFilter: (next: WingFilterValue) => void
  isLocked: boolean
}

export function useWingFilter(
  initialFilter: WingFilterValue = 'all',
  lockedWing?: UserWingAssignment | SchoolWing | null
): UseWingFilterReturn {
  const isLocked = lockedWing === 'Cambridge' || lockedWing === 'NECTA'
  const [wingFilter, setWingFilterState] = useState<WingFilterValue>(() => {
    if (lockedWing === 'Cambridge') return 'Cambridge'
    if (lockedWing === 'NECTA') return 'NECTA'
    return initialFilter
  })

  useEffect(() => {
    if (lockedWing === 'Cambridge') {
      setWingFilterState('Cambridge')
      return
    }
    if (lockedWing === 'NECTA') {
      setWingFilterState('NECTA')
      return
    }

    const cookieVal = readWingCookieClient()
    if (cookieVal !== wingFilter && initialFilter === 'all') {
      setWingFilterState(cookieVal)
    }

    const handleWingChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ wing: WingFilterValue }>
      if (customEvent.detail?.wing) {
        setWingFilterState(customEvent.detail.wing)
      }
    }

    window.addEventListener('lis-wing-change', handleWingChange)
    return () => window.removeEventListener('lis-wing-change', handleWingChange)
  }, [lockedWing, initialFilter])

  const setWingFilter = useCallback(
    (next: WingFilterValue) => {
      if (isLocked) return
      setWingFilterState(next)
      writeWingCookieClient(next)
    },
    [isLocked]
  )

  const effectiveWing: WingFilterValue = isLocked ? (lockedWing as WingFilterValue) : wingFilter
  const tuple = [effectiveWing, setWingFilter, isLocked] as [
    WingFilterValue,
    (next: WingFilterValue) => void,
    boolean
  ]
  return Object.assign(tuple, {
    wingFilter: effectiveWing,
    setWingFilter,
    isLocked,
  })
}

export function WingBadge({
  wing,
  item,
  size = 'sm',
}: {
  wing?: SchoolWing | string | null
  item?: Parameters<typeof inferWing>[0]
  size?: 'xs' | 'sm'
}) {
  const resolved: SchoolWing =
    wing?.toLowerCase() === 'cambridge'
      ? 'Cambridge'
      : wing?.toLowerCase() === 'necta'
        ? 'NECTA'
        : inferWing(item || wing)

  const isCambridge = resolved === 'Cambridge'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: size === 'xs' ? '0.1rem 0.45rem' : '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: size === 'xs' ? '0.68rem' : '0.74rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        backgroundColor: isCambridge ? 'rgba(29, 78, 216, 0.1)' : 'rgba(13, 148, 136, 0.12)',
        color: isCambridge ? '#1d4ed8' : '#0f766e',
        border: `1px solid ${isCambridge ? 'rgba(29, 78, 216, 0.25)' : 'rgba(13, 148, 136, 0.28)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isCambridge ? '#1d4ed8' : '#0d9488',
        }}
      />
      {resolved}
    </span>
  )
}

export function WingSegmentedBar({
  value,
  onChange,
  lockedWing,
  counts,
  compact,
}: {
  value: WingFilterValue
  onChange: (val: WingFilterValue) => void
  lockedWing?: UserWingAssignment | SchoolWing | null
  counts?: {
    all?: number
    cambridge?: number
    necta?: number
    Cambridge?: number
    NECTA?: number
  }
  compact?: boolean
}) {
  if (lockedWing === 'Cambridge' || lockedWing === 'NECTA') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: compact ? '0.25rem 0.6rem' : '0.35rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0,0,0,0.03)',
          border: '1px solid var(--color-border)',
          fontSize: compact ? '0.75rem' : '0.8rem',
          fontWeight: 600,
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>Assigned Wing:</span>
        <WingBadge wing={lockedWing} />
      </div>
    )
  }

  const options: { key: WingFilterValue; label: string; count?: number; activeBg: string; activeColor: string }[] = [
    {
      key: 'all',
      label: 'All Wings',
      count: counts?.all,
      activeBg: '#0f172a',
      activeColor: '#ffffff',
    },
    {
      key: 'Cambridge',
      label: 'Cambridge Wing',
      count: counts?.cambridge ?? counts?.Cambridge,
      activeBg: '#1d4ed8',
      activeColor: '#ffffff',
    },
    {
      key: 'NECTA',
      label: 'NECTA Wing',
      count: counts?.necta ?? counts?.NECTA,
      activeBg: '#0d9488',
      activeColor: '#ffffff',
    },
  ]

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem',
        borderRadius: '10px',
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        border: '1px solid var(--color-border)',
      }}
    >
      {options.map((opt) => {
        const active =
          value.toLowerCase() === opt.key.toLowerCase()
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: active ? opt.activeBg : 'transparent',
              color: active ? opt.activeColor : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '999px',
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
