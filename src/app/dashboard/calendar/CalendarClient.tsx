'use client'

import React, { useState, useTransition } from 'react'
import { saveCalendarEventAction } from './actions'

interface ClassData {
  id: string
  name: string
  section: string
}

interface CalendarEvent {
  id: string
  title: string
  event_type: 'Public Holiday' | 'Exams' | 'School Activity' | 'Staff Meeting' | 'Other'
  start_date: string
  end_date: string
  description: string
  target_audience: 'All School' | 'Section' | 'Class'
  audience_ids: string[]
  attachment_url?: string
  created_by?: string
  created_at?: string
}

interface CalendarClientProps {
  events: CalendarEvent[]
  classes: ClassData[]
  availableSections: string[]
  userRole: string
  userId: string
}

export default function CalendarClient({
  events,
  classes,
  availableSections,
  userRole,
  userId
}: CalendarClientProps) {
  // Navigation & Views
  const [viewDate, setViewDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('All')
  
  // Add Event Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [targetAudience, setTargetAudience] = useState<'All School' | 'Section' | 'Class'>('All School')
  const [isPending, startTransition] = useTransition()
  const [formMessage, setFormMessage] = useState<{ success: boolean; text: string } | null>(null)

  // Selected Event Details Modal State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Print State
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printFromDate, setPrintFromDate] = useState('')
  const [printToDate, setPrintToDate] = useState('')
  
  const handlePrintAction = () => {
    if (!printFromDate || !printToDate) return;
    window.print();
  }

  const allowedToManage = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'].includes(userRole)

  // Calendar calculations
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setViewDate(new Date())
  }

  // Get color configuration based on event type
  const getEventColor = (type: string) => {
    switch (type) {
      case 'Public Holiday':
        return {
          dot: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.08)',
          text: '#b91c1c',
          border: '#fca5a5'
        }
      case 'Exams':
        return {
          dot: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.08)',
          text: '#1d4ed8',
          border: '#93c5fd'
        }
      case 'School Activity':
        return {
          dot: '#10b981',
          bg: 'rgba(16, 185, 129, 0.08)',
          text: '#047857',
          border: '#6ee7b7'
        }
      case 'Staff Meeting':
        return {
          dot: '#f97316',
          bg: 'rgba(249, 115, 22, 0.08)',
          text: '#c2410c',
          border: '#fdba74'
        }
      case 'Other':
      default:
        return {
          dot: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.08)',
          text: '#7e22ce',
          border: '#d8b4fe'
        }
    }
  }

  // Helper to check if event overlaps with a day
  const isEventOnDay = (event: CalendarEvent, dayDate: Date) => {
    const dayStart = new Date(dayDate)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(dayDate)
    dayEnd.setHours(23, 59, 59, 999)

    const eventStart = new Date(event.start_date)
    const eventEnd = new Date(event.end_date)

    return eventStart <= dayEnd && eventEnd >= dayStart
  }

  // Helper to check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  // Filter events based on Search, Event Type Filter, and Month/Year (for Month View)
  const getFilteredEvents = () => {
    return events.filter(event => {
      // 1. Search Query
      const matchesSearch = 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesSearch) return false

      // 2. Type Filter
      if (filterType !== 'All' && event.event_type !== filterType) {
        return false
      }

      return true
    })
  }

  const currentFilteredEvents = getFilteredEvents()

  // Build grid of days for the selected month
  const getDaysGrid = () => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const numDays = new Date(year, month + 1, 0).getDate()
    const prevNumDays = new Date(year, month, 0).getDate()

    const grid = []

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({
        day: prevNumDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevNumDays - i)
      })
    }

    // Current month
    for (let i = 1; i <= numDays; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      })
    }

    // Next month padding to make it a full week grid
    const totalSlots = grid.length > 35 ? 42 : 35
    const remaining = totalSlots - grid.length
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      })
    }

    return grid
  }

  const daysGrid = getDaysGrid()

  // Format Date Ranges
  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    
    const sameDay = start.toDateString() === end.toDateString()
    
    const optionsDate: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    const optionsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }

    if (sameDay) {
      return `${start.toLocaleDateString('en-US', optionsDate)} | ${start.toLocaleTimeString('en-US', optionsTime)} - ${end.toLocaleTimeString('en-US', optionsTime)}`
    } else {
      return `${start.toLocaleDateString('en-US', optionsDate)} ${start.toLocaleTimeString('en-US', optionsTime)} to ${end.toLocaleDateString('en-US', optionsDate)} ${end.toLocaleTimeString('en-US', optionsTime)}`
    }
  }

  // Handle Create Event Submission
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await saveCalendarEventAction({ error: null }, formData)
      if (result.success) {
        setFormMessage({ success: true, text: 'Event created and scheduled successfully!' })
        // Clear message after 4s
        setTimeout(() => setFormMessage(null), 4000)
        
        // Reset form state
        setShowAddForm(false)
        setTargetAudience('All School')
        
        // Find and reset form elements
        const form = document.getElementById('add-event-form') as HTMLFormElement
        if (form) form.reset()
      } else {
        setFormMessage({ success: false, text: result.error || 'Failed to save event.' })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title & Add button header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>Calendar & Schedule</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            View academic terms, holidays, activities, exams, and staff meetings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary no-print"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setShowPrintModal(true)}
          >
            🖨️ Print Events
          </button>
          {allowedToManage && (
            <button 
              className="btn btn-primary no-print"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => {
                setShowAddForm(!showAddForm)
                setFormMessage(null)
              }}
            >
              {showAddForm ? '✕ Close Form' : '➕ Add Event'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Container: calendar/form and sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: showAddForm ? '1.2fr 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Add Form (Collapsible, takes side space if open) */}
        {showAddForm && allowedToManage && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', color: 'var(--color-primary)' }}>
              Create New Event
            </h2>
            
            <form id="add-event-form" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Event Title *</label>
                <input required type="text" name="title" className="input-field" placeholder="e.g. Mid-Term Examinations" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Event Type *</label>
                  <select required name="event_type" className="input-field" style={{ height: '42px', padding: '0 0.5rem' }}>
                    <option value="School Activity">School Activity</option>
                    <option value="Exams">Exams</option>
                    <option value="Public Holiday">Public Holiday</option>
                    <option value="Staff Meeting">Staff Meeting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Target Audience *</label>
                  <select 
                    required 
                    name="target_audience" 
                    className="input-field" 
                    style={{ height: '42px', padding: '0 0.5rem' }}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                  >
                    <option value="All School">All School</option>
                    <option value="Section">Section</option>
                    <option value="Class">Class</option>
                  </select>
                </div>
              </div>

              {/* Conditional Audience ID details selection */}
              {targetAudience === 'Section' && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Select Target Sections *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    {availableSections.map(sec => (
                      <label key={sec} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" name="audience_ids" value={sec} defaultChecked />
                        {sec}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetAudience === 'Class' && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Select Target Classes *</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.5rem' }}>
                    {classes.map(cls => (
                      <label key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" name="audience_ids" value={cls.id} />
                        <span>{cls.name} <small style={{ color: 'var(--color-text-muted)' }}>({cls.section})</small></span>
                      </label>
                    ))}
                    {classes.length === 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No classes available to select.</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Starts At *</label>
                  <input required type="datetime-local" name="start_date" className="input-field" />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Ends At *</label>
                  <input required type="datetime-local" name="end_date" className="input-field" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Event Description *</label>
                <textarea required name="description" rows={3} className="input-field" placeholder="Provide details about the event, location, instructions..."></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Attachment URL (Optional)</label>
                <input type="url" name="attachment_url" className="input-field" placeholder="https://example.com/agenda.pdf" />
              </div>

              <button type="submit" disabled={isPending} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {isPending ? 'Saving Event...' : '📅 Publish Calendar Event'}
              </button>

              {formMessage && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: formMessage.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: formMessage.success ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  {formMessage.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Right/Main Body: Calendar views & filter options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Filtering bar and Navigation Bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            
            {/* View navigation controls (Today, Prev, Next) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn" style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handleToday}>
                Today
              </button>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button className="btn" style={{ padding: '0.4rem 0.6rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handlePrevMonth}>
                  ◀
                </button>
                <button className="btn" style={{ padding: '0.4rem 0.6rem', background: 'transparent', border: '1px solid var(--color-border)' }} onClick={handleNextMonth}>
                  ▶
                </button>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.5rem', color: 'var(--color-primary)' }}>
                {monthNames[month]} {year}
              </h3>
            </div>

            {/* View Type Toggle (Month vs List) */}
            <div style={{ display: 'flex', gap: '1px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
              <button 
                className="btn" 
                style={{ 
                  padding: '0.4rem 1rem', 
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: viewMode === 'month' ? 'var(--color-surface)' : 'transparent',
                  color: viewMode === 'month' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '0.8rem'
                }}
                onClick={() => setViewMode('month')}
              >
                Month Grid
              </button>
              <button 
                className="btn" 
                style={{ 
                  padding: '0.4rem 1rem', 
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: viewMode === 'list' ? 'var(--color-surface)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '0.8rem'
                }}
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
            </div>
          </div>

          {/* Filtering options card */}
          <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
            <div>
              <input 
                type="text" 
                placeholder="🔍 Search events..." 
                className="input-field" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Type:</span>
              <select 
                className="input-field" 
                style={{ width: '150px', padding: '0.5rem' }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="School Activity">School Activity</option>
                <option value="Exams">Exams</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Staff Meeting">Staff Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Colors Legends popup or tooltip container */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Public Holiday', 'Exams', 'School Activity', 'Staff Meeting', 'Other'].map(type => {
                const c = getEventColor(type)
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.dot }}></span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{type}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rendering the calendar contents */}
          {viewMode === 'month' ? (
            /* Month Calendar Grid View */
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              
              {/* Day header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'rgba(0,0,0,0.02)', textAlign: 'center', borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
                {weekdays.map(wd => (
                  <div key={wd} style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{wd}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-border)', gap: '1px' }}>
                {daysGrid.map((cell, idx) => {
                  // Get day events
                  const dayEvents = currentFilteredEvents.filter(e => isEventOnDay(e, cell.date))
                  const cellIsToday = isToday(cell.date)

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        minHeight: '110px', 
                        backgroundColor: cell.isCurrentMonth ? 'var(--color-surface)' : 'rgba(0,0,0,0.03)',
                        padding: '0.4rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.25rem',
                        position: 'relative',
                        opacity: cell.isCurrentMonth ? 1 : 0.6
                      }}
                    >
                      {/* Day Number and Today indicator */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        {cellIsToday ? (
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#fff',
                            backgroundColor: 'var(--color-secondary)',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {cell.day}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: cell.isCurrentMonth ? 600 : 400, color: 'var(--color-text-muted)' }}>
                            {cell.day}
                          </span>
                        )}
                        
                        {dayEvents.length > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Day Events Container */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', flex: 1 }}>
                        {dayEvents.slice(0, 3).map(e => {
                          const colors = getEventColor(e.event_type)
                          return (
                            <button
                              key={e.id}
                              onClick={() => setSelectedEvent(e)}
                              style={{
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                backgroundColor: colors.bg,
                                color: colors.text,
                                borderLeft: `3px solid ${colors.dot}`,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                width: '100%',
                                transition: 'transform 0.1s'
                              }}
                              title={e.title}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                            >
                              {e.title}
                            </button>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div 
                            style={{ 
                              fontSize: '0.7rem', 
                              color: 'var(--color-text-muted)', 
                              paddingLeft: '0.2rem', 
                              fontWeight: 500,
                              cursor: 'pointer' 
                            }}
                            onClick={() => {
                              // Switch to list view for this month or show custom modal
                              setViewMode('list')
                              setSearchQuery('')
                            }}
                          >
                            + {dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* List View of Events */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Only show list of events happening in the selected month */}
              {(() => {
                const monthEvents = currentFilteredEvents.filter(e => {
                  const s = new Date(e.start_date)
                  const end = new Date(e.end_date)
                  // Overlaps with current month
                  const targetStart = new Date(year, month, 1)
                  const targetEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
                  return s <= targetEnd && end >= targetStart
                })

                if (monthEvents.length === 0) {
                  return (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ fontSize: '1rem', fontWeight: 500 }}>No events scheduled for {monthNames[month]} {year}.</p>
                      {searchQuery || filterType !== 'All' ? (
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try clearing your filters or search terms.</p>
                      ) : null}
                    </div>
                  )
                }

                return monthEvents.map(event => {
                  const colors = getEventColor(event.event_type)
                  return (
                    <div 
                      key={event.id}
                      className="glass-panel animate-fade-in"
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `5px solid ${colors.dot}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        transition: 'transform var(--transition-fast)'
                      }}
                      onClick={() => setSelectedEvent(event)}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(4px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-primary)' }}>{event.title}</h3>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`
                        }}>
                          {event.event_type}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        <span>📅</span>
                        <span>{formatDateRange(event.start_date, event.end_date)}</span>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {event.description}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <div>
                          <strong>Audience:</strong> {event.target_audience}
                        </div>
                        {event.attachment_url && (
                          <a 
                            href={event.attachment_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 600 }}
                            onClick={(e) => e.stopPropagation()} // Prevent card click trigger
                          >
                            📎 View Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Selected Event Details Modal Dialog */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }} onClick={() => setSelectedEvent(null)}>
          <div 
            className="glass-panel" 
            style={{
              width: '100%',
              maxWidth: '550px',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>{selectedEvent.title}</h2>
              <button 
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                onClick={() => setSelectedEvent(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: getEventColor(selectedEvent.event_type).bg,
                color: getEventColor(selectedEvent.event_type).text,
                border: `1px solid ${getEventColor(selectedEvent.event_type).border}`
              }}>
                {selectedEvent.event_type}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'rgba(0,0,0,0.05)',
                color: 'var(--color-text-muted)'
              }}>
                Audience: {selectedEvent.target_audience}
              </span>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Date & Time</h4>
              <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Event Description</h4>
              <p style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: 'var(--color-text)', lineHeight: 1.6 }}>
                {selectedEvent.description}
              </p>
            </div>

            {selectedEvent.attachment_url && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Attachment</h4>
                <a 
                  href={selectedEvent.attachment_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    textDecoration: 'none',
                    color: 'var(--color-secondary)',
                    fontWeight: 600
                  }}
                >
                  📎 Open Attached Agenda/Notice
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button className="btn" style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }} onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }} className="no-print">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Print Calendar Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>From Date</label>
                <input type="date" className="input-field" value={printFromDate} onChange={(e) => setPrintFromDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>To Date</label>
                <input type="date" className="input-field" value={printToDate} onChange={(e) => setPrintToDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowPrintModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handlePrintAction} disabled={!printFromDate || !printToDate}>🖨️ Print Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="print-only" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>School Calendar & Schedule</h1>
        <p style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
          Date Range: {printFromDate || '...'} to {printToDate || '...'}
        </p>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Date</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Event</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Type</th>
              <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Audience</th>
            </tr>
          </thead>
          <tbody>
            {events
              .filter(e => {
                if (!printFromDate || !printToDate) return false;
                const eStart = new Date(e.start_date);
                const from = new Date(printFromDate);
                const to = new Date(printToDate);
                to.setHours(23, 59, 59, 999);
                return eStart >= from && eStart <= to;
              })
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(e.start_date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{e.title}</td>
                  <td style={{ padding: '8px' }}>{e.event_type}</td>
                  <td style={{ padding: '8px' }}>{e.target_audience}</td>
                </tr>
              ))}
          </tbody>
        </table>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print, .sidebar-desktop, .mobile-overlay, .mobile-sidebar, header, .mobile-toggle, .glass-panel { 
              display: none !important; 
            }
            body, .main-content-area, html { 
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-only {
              display: block !important;
            }
          }
        `}} />
      </div>

    </div>
  )
}
