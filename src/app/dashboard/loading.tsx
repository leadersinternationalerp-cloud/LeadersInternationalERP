export default function DashboardLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        animation: 'pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div
            style={{
              height: '1.9rem',
              width: '240px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          />
          <div
            style={{
              height: '0.95rem',
              width: '340px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-sm)',
              marginTop: '0.5rem',
            }}
          />
        </div>
        <div
          style={{
            height: '2.25rem',
            width: '140px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: '1.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                width: '2.75rem',
                height: '2.75rem',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '0.75rem',
                  width: '90px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.5rem',
                }}
              />
              <div
                style={{
                  height: '1.4rem',
                  width: '120px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="glass-panel"
        style={{
          height: '340px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
        }}
      />
    </div>
  )
}
