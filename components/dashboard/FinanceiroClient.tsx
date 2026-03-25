'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FinancialBarChart } from './FinancialBarChart'
import { CategoryPieChart } from './CategoryPieChart'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string | null
  date: string
}

interface MonthData { month: string; income: number; expense: number }
interface CategoryData { name: string; value: number }

interface Props {
  initialMonthly: MonthData[]
  initialCategory: CategoryData[]
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PERIODS = [
  { value: 'month', label: 'Este mês' },
  { value: 'week', label: 'Esta semana' },
  { value: 'year', label: 'Este ano' },
]

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Moradia',
  'Educação', 'Vestuário', 'Renda', 'Freelance', 'Outros',
]

export function FinanceiroClient({ initialMonthly, initialCategory }: Props) {
  const [period, setPeriod] = useState('month')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, savingsRate: 0 })
  const [categoryData, setCategoryData] = useState<CategoryData[]>(initialCategory)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (categoryFilter) params.set('category', categoryFilter)
      if (typeFilter) params.set('type', typeFilter)

      const [summaryRes, txRes] = await Promise.all([
        fetch(`/api/financial?view=summary&${params}`),
        fetch(`/api/financial?view=transactions&${params}&limit=50`),
      ])

      const summaryData = await summaryRes.json()
      const txData = await txRes.json()

      setSummary({
        income: summaryData.income ?? 0,
        expense: summaryData.expense ?? 0,
        balance: summaryData.balance ?? 0,
        savingsRate: summaryData.savingsRate ?? 0,
      })
      setCategoryData(summaryData.categoryBreakdown ?? [])
      setTransactions(txData.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [period, categoryFilter, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  async function deleteTransaction(id: string) {
    await fetch(`/api/financial?id=${id}`, { method: 'DELETE' })
    toast.success('Transação excluída.')
    fetchData()
  }

  const cards = [
    { label: 'Receitas', value: fmt(summary.income), color: '#34D399' },
    { label: 'Despesas', value: fmt(summary.expense), color: '#F87171' },
    { label: 'Saldo', value: fmt(summary.balance), color: summary.balance >= 0 ? '#34D399' : '#F87171' },
    { label: 'Economia', value: `${summary.savingsRate}%`, color: '#6366F1' },
  ]

  return (
    <div className="financeiro">
      {/* Filtro de período */}
      <div className="financeiro-toolbar">
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`period-tab${period === p.value ? ' period-tab--active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nova transação
        </button>
      </div>

      {/* Cards */}
      <div className="financeiro-cards">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <span className="stat-card-label">{label}</span>
            <p className="stat-card-value" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="financeiro-charts">
        <div className="chart-card">
          <h2 className="section-title">Entradas vs Saídas</h2>
          <p className="section-sub">Últimos 6 meses</p>
          <FinancialBarChart data={initialMonthly} />
        </div>
        <div className="chart-card">
          <h2 className="section-title">Gastos por categoria</h2>
          <p className="section-sub">{PERIODS.find((p) => p.value === period)?.label}</p>
          <CategoryPieChart data={categoryData} />
        </div>
      </div>

      {/* Tabela */}
      <div className="table-card">
        <div className="table-header">
          <h2 className="section-title">Transações</h2>
          <div className="table-filters">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="empty-state">Nenhuma transação encontrada.</p>
        ) : (
          <div className="transactions-table">
            <div className="transactions-table-head">
              <span>Descrição</span>
              <span>Categoria</span>
              <span>Data</span>
              <span>Valor</span>
              <span />
            </div>
            {transactions.map((t) => (
              <div key={t.id} className="transactions-table-row">
                <span className="tx-desc">{t.description || '—'}</span>
                <span className="tx-badge">{t.category}</span>
                <span className="tx-date">
                  {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                <span className={`tx-amount tx-amount--${t.type}`}>
                  {t.type === 'expense' ? '−' : '+'}{fmt(Number(t.amount))}
                </span>
                <button
                  className="tx-delete"
                  onClick={() => deleteTransaction(t.id)}
                  aria-label="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nova transação */}
      {showModal && (
        <NewTransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}

function NewTransactionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.get('type'),
        amount: Number(form.get('amount')),
        category: form.get('category'),
        description: form.get('description') || undefined,
        date: form.get('date') || undefined,
      }),
    })

    if (res.ok) {
      toast.success('Transação salva!')
      onSuccess()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar.')
      toast.error(data.error ?? 'Erro ao salvar.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Nova transação</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-row">
            <div className="form-group">
              <label>Tipo</label>
              <select name="type" required className="form-select">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div className="form-group">
              <label>Valor (R$)</label>
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" />
            </div>
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select name="category" required className="form-select">
              <option value="">Selecione…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input name="description" type="text" placeholder="Opcional" />
          </div>
          <div className="form-group">
            <label>Data</label>
            <input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
