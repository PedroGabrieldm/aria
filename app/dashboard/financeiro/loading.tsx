export default function FinanceiroLoading() {
  return (
    <div className="financeiro">
      <div className="skeleton" style={{ height: 40, width: 280, borderRadius: 8 }} />
      <div className="financeiro-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="skeleton" style={{ height: 13, width: '50%', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: 26, width: '70%' }} />
          </div>
        ))}
      </div>
      <div className="financeiro-charts">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="chart-card">
            <div className="skeleton" style={{ height: 14, width: 160, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 220 }} />
          </div>
        ))}
      </div>
      <div className="table-card">
        <div className="skeleton" style={{ height: 14, width: 120, marginBottom: '1rem' }} />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-row" />)}
      </div>
    </div>
  )
}
