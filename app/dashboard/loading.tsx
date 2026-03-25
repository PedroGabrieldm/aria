export default function OverviewLoading() {
  return (
    <div className="overview">
      <div className="overview-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: '0.5rem' }} />
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
          </div>
        ))}
      </div>
      <div className="overview-middle">
        <div className="overview-chart-card">
          <div className="skeleton" style={{ height: 16, width: 180, marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
        <div className="overview-events-card">
          <div className="skeleton" style={{ height: 16, width: 140, marginBottom: '1rem' }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 13, width: '80%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 11, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="overview-transactions">
        <div className="skeleton" style={{ height: 16, width: 160, marginBottom: '1rem' }} />
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-row" />)}
      </div>
    </div>
  )
}
