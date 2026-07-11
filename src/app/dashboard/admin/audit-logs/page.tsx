import { createClient } from '@/utils/supabase/server'

export default async function AuditLogsPage(props: {
  searchParams: Promise<{ query?: string; actionType?: string }>
}) {
  const supabase = await createClient()

  // 1. Verify user role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const isAdmin = profile?.role === 'System Admin' || profile?.role === 'Director'

  if (!isAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // 2. Parse search parameters
  const params = await props.searchParams
  const query = params.query || ''
  const actionType = params.actionType || ''

  // 3. Fetch unique action types for the dropdown list (latest 1000)
  const { data: allActions } = await supabase
    .from('audit_logs')
    .select('action')
    .order('created_at', { ascending: false })
    .limit(1000)

  const actionTypes = Array.from(new Set(allActions?.map((a) => a.action) || []))

  // 4. Query audit logs with target filters
  let queryBuilder = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      target_table,
      details,
      ip_address,
      created_at,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (actionType) {
    queryBuilder = queryBuilder.eq('action', actionType)
  }

  const { data: logs, error } = await queryBuilder

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Error Loading Audit Logs</h2>
        <p>{error.message}</p>
      </div>
    )
  }

  // 5. In-memory filter for general text search query
  const filteredLogs = logs?.filter((log) => {
    if (!query) return true
    const q = query.toLowerCase()
    const logAction = (log.action || '').toLowerCase()
    const logTable = (log.target_table || '').toLowerCase()
    const logIp = (log.ip_address || '').toLowerCase()

    const prof = log.profiles as any
    const firstName = (prof?.first_name || '').toLowerCase()
    const lastName = (prof?.last_name || '').toLowerCase()
    const fullName = `${firstName} ${lastName}`.trim()

    return (
      logAction.includes(q) ||
      logTable.includes(q) ||
      logIp.includes(q) ||
      firstName.includes(q) ||
      lastName.includes(q) ||
      fullName.includes(q)
    )
  }) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Security Audit Logs</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Monitor system security activities, data mutations, and administrative operations.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <form method="GET" action="/admin/audit-logs" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Search</label>
            <input
              type="text"
              name="query"
              placeholder="Search user, action, table, or IP..."
              className="input-field"
              defaultValue={query}
            />
          </div>
          <div style={{ width: '220px' }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Action Type</label>
            <select name="actionType" className="input-field" defaultValue={actionType}>
              <option value="">All Action Types</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', height: '42px', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
              Apply Filters
            </button>
            {(query || actionType) && (
              <a
                href="/admin/audit-logs"
                className="btn"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 1rem'
                }}
              >
                Reset
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem' }}>User Name</th>
                <th style={{ padding: '1rem' }}>Action</th>
                <th style={{ padding: '1rem' }}>Target Table</th>
                <th style={{ padding: '1rem' }}>IP Address</th>
                <th style={{ padding: '1rem' }}>Timestamp</th>
                <th style={{ padding: '1rem' }}>Metadata Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const prof = log.profiles as any
                const userName = prof ? `${prof.first_name} ${prof.last_name}` : 'System / Deleted User'
                const formattedTime = new Date(log.created_at).toLocaleString()

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 150ms' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{userName}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(59, 179, 195, 0.1)',
                        color: 'var(--color-secondary)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {log.target_table || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {formattedTime}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 500 }}>
                            View Payload
                          </summary>
                          <pre style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0,0,0,0.03)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            overflowX: 'auto',
                            fontFamily: 'monospace',
                            maxWidth: '300px'
                          }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No details</span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
