export default function ConfiguracoesLoading() {
  return (
    <div className="config-root">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="config-section">
          <div className="config-section-header">
            <div className="skeleton" style={{ height: 14, width: 160 }} />
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
