export default function TarefasLoading() {
  return (
    <div className="todo-skeleton">
      <div className="skeleton" style={{ height: 26, width: 140, marginBottom: '1.25rem' }} />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
          <div className="skeleton" style={{ height: 14, flex: 1, maxWidth: 300 }} />
        </div>
      ))}
    </div>
  )
}
