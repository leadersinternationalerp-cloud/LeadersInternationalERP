import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string | null
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Excused'
  profiles: {
    first_name: string
    last_name: string
    role: string
  } | null
  classes: {
    name: string
  } | null
}

export default async function DirectorAttendanceReportsPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; range?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Parse filters
  const params = await searchParams
  const viewType = params.type || 'student' // 'student' or 'staff'
  const dateRange = params.range || 'daily' // 'daily', 'weekly', 'monthly', '3months'

  // Determine date filter threshold
  const today = new Date()
  let thresholdDate = new Date()
  if (dateRange === 'weekly') {
    thresholdDate.setDate(today.getDate() - 7)
  } else if (dateRange === 'monthly') {
    thresholdDate.setMonth(today.getMonth() - 1)
  } else if (dateRange === '3months') {
    thresholdDate.setMonth(today.getMonth() - 3)
  } else {
    thresholdDate.setDate(today.getDate() - 1) // Daily (Yesterday onwards)
  }
  const thresholdString = thresholdDate.toISOString().split('T')[0]

  // Query attendance records
  let query = supabase
    .from('attendance')
    .select(`
      *,
      profiles:student_id (first_name, last_name, role),
      classes:class_id (name)
    `)
    .order('date', { ascending: false })

  if (dateRange !== 'daily') {
    query = query.gte('date', thresholdString)
  } else {
    // For daily, default to today's date
    const todayStr = today.toISOString().split('T')[0]
    query = query.eq('date', todayStr)
  }

  const { data: rawRecords, error } = await query

  if (error) {
    console.error('Failed to load attendance records:', error.message)
  }

  const allRecords: AttendanceRecord[] = (rawRecords as any) || []

  // Filter records by Students vs Staff
  const filteredRecords = allRecords.filter(rec => {
    const isStudentRole = rec.profiles?.role === 'Student'
    return viewType === 'student' ? isStudentRole : !isStudentRole
  })

  // Calculate metrics
  const totalCount = filteredRecords.length
  const presentCount = filteredRecords.filter(r => r.status === 'Present').length
  const lateCount = filteredRecords.filter(r => r.status === 'Late').length
  const absentCount = filteredRecords.filter(r => r.status === 'Absent').length
  const excusedCount = filteredRecords.filter(r => r.status === 'Excused').length

  const attendanceRate = totalCount > 0 
    ? Math.round(((presentCount + lateCount) / totalCount) * 100) 
    : 100

  // Calculate attendance trends (grouping by date)
  const trendsMap: Record<string, { present: number; total: number }> = {}
  filteredRecords.forEach(r => {
    if (!trendsMap[r.date]) {
      trendsMap[r.date] = { present: 0, total: 0 }
    }
    trendsMap[r.date].total++
    if (r.status === 'Present' || r.status === 'Late') {
      trendsMap[r.date].present++
    }
  })

  const sortedTrendDates = Object.keys(trendsMap).sort().slice(-7) // Last 7 dates
  const trends = sortedTrendDates.map(date => {
    const data = trendsMap[date]
    return {
      date,
      rate: Math.round((data.present / data.total) * 100)
    }
  })

  // Individual staff trends
  const staffTrends: Record<string, { name: string; present: number; late: number; absent: number; excused: number; total: number; role: string }> = {}
  if (viewType === 'staff') {
    filteredRecords.forEach(r => {
      const name = r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : 'Unknown'
      if (!staffTrends[name]) {
        staffTrends[name] = { name, present: 0, late: 0, absent: 0, excused: 0, total: 0, role: r.profiles?.role || 'Staff' }
      }
      staffTrends[name].total++
      if (r.status === 'Present') staffTrends[name].present++
      if (r.status === 'Late') staffTrends[name].late++
      if (r.status === 'Absent') staffTrends[name].absent++
      if (r.status === 'Excused') staffTrends[name].excused++
    })
  }
  const staffTrendList = Object.values(staffTrends).map(t => ({
    ...t,
    rate: t.total > 0 ? Math.round(((t.present + t.late) / t.total) * 100) : 0
  })).sort((a, b) => b.rate - a.rate)

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Attendance Analytics & Reports
      </h1>

      {/* Tabs and Filters Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* User Type Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <Link 
            href={`/dashboard/director/attendance?type=student&range=${dateRange}`}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
              backgroundColor: viewType === 'student' ? 'var(--color-surface)' : 'transparent',
              color: viewType === 'student' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: viewType === 'student' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Students Attendance
          </Link>
          <Link 
            href={`/dashboard/director/attendance?type=staff&range=${dateRange}`}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
              backgroundColor: viewType === 'staff' ? 'var(--color-surface)' : 'transparent',
              color: viewType === 'staff' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: viewType === 'staff' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Staff & Teachers Attendance
          </Link>
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'daily', label: 'Today' },
            { value: 'weekly', label: '7 Days' },
            { value: 'monthly', label: '30 Days' },
            { value: '3months', label: '3 Months' }
          ].map(r => (
            <Link
              key={r.value}
              href={`/dashboard/director/attendance?type=${viewType}&range=${r.value}`}
              style={{
                padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500,
                backgroundColor: dateRange === r.value ? 'var(--color-primary)' : 'transparent',
                color: dateRange === r.value ? '#ffffff' : 'var(--color-text-muted)',
                border: dateRange === r.value ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
              }}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Average Attendance</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{attendanceRate}%</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Present / Late</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{presentCount + lateCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({presentCount} On Time • {lateCount} Late)</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Absent</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error)' }}>{absentCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Excused</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{excusedCount}</div>
        </div>
      </div>

      {/* Attendance Trends & Detail Table Grid */}
      {viewType === 'staff' && dateRange !== 'daily' && staffTrendList.length > 0 && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Individual Staff Attendance Summaries ({dateRange})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <th style={{ padding: '1rem' }}>Staff Name</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Present</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Late</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Absent</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Excused</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                {staffTrendList.map((staff) => (
                  <tr key={staff.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{staff.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{staff.role}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>{staff.present}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-warning)', fontWeight: 600 }}>{staff.late}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-error)', fontWeight: 600 }}>{staff.absent}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-primary)' }}>{staff.excused}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 700,
                        backgroundColor: staff.rate >= 90 ? 'rgba(16, 185, 129, 0.1)' : staff.rate >= 75 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: staff.rate >= 90 ? 'var(--color-success)' : staff.rate >= 75 ? 'var(--color-warning)' : 'var(--color-error)'
                      }}>
                        {staff.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: trends.length > 0 ? '1.5fr 1fr' : '1fr', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
        {/* Detail Records List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Detailed Attendance Records ({filteredRecords.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>{viewType === 'student' ? 'Class' : 'Role'}</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {rec.profiles ? `${rec.profiles.first_name} ${rec.profiles.last_name}` : 'Unknown'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                      {viewType === 'student' 
                        ? (rec.classes?.name || 'Unassigned') 
                        : (rec.profiles?.role || 'Staff')}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {formatDate(rec.date)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: 
                          rec.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' :
                          rec.status === 'Late' ? 'rgba(245, 158, 11, 0.1)' :
                          rec.status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color:
                          rec.status === 'Present' ? 'var(--color-success)' :
                          rec.status === 'Late' ? 'var(--color-warning)' :
                          rec.status === 'Absent' ? 'var(--color-error)' : 'var(--color-primary)'
                      }}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No attendance records found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Minimalist Chart showing Daily Trend */}
        {trends.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Daily Attendance Trend</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {trends.map(t => (
                <div key={t.date} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    <span>{formatDate(t.date)}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{t.rate}% Rate</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${t.rate}%`, height: '100%', borderRadius: '4px',
                      backgroundColor: t.rate >= 90 ? 'var(--color-success)' : t.rate >= 75 ? 'var(--color-warning)' : 'var(--color-error)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
