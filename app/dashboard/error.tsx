'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="error-page">
      <div className="error-icon">
        <AlertTriangle size={36} />
      </div>
      <h2 className="error-title">Algo deu errado</h2>
      <p className="error-msg">
        {error.message || 'Ocorreu um erro inesperado ao carregar esta página.'}
      </p>
      <button className="btn-primary" onClick={reset}>
        <RefreshCw size={15} />
        Tentar novamente
      </button>
    </div>
  )
}
