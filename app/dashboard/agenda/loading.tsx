export default function AgendaLoading() {
  return (
    <div className="calendar-root">
      <div className="calendar-main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 28, width: 160, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 16, borderRadius: 4 }} />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />
          ))}
        </div>
      </div>
      <div className="calendar-sidebar">
        <div className="skeleton" style={{ height: 14, width: 120, marginBottom: '1rem' }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  )
}
