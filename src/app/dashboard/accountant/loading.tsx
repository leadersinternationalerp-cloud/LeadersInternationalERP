export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      <div>
        <div style={{ height: '2rem', width: '200px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}></div>
        <div style={{ height: '1rem', width: '300px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}></div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}></div>
            <div>
              <div style={{ height: '0.75rem', width: '80px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}></div>
              <div style={{ height: '1.5rem', width: '120px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ height: '300px', backgroundColor: 'var(--color-surface)' }}></div>
        <div className="glass-panel" style={{ height: '300px', backgroundColor: 'var(--color-surface)' }}></div>
      </div>
    </div>
  )
}
