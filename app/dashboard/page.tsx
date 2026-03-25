import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listCalendarEvents, type CalendarToken } from '@/lib/google-calendar'
import { FinancialChart } from '@/components/dashboard/FinancialChart'
import { startOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckSquare,
  CalendarDays,
} from 'lucide-react'

async function getFinancialSummary(userId: string) {
  const supabase = await createSupabaseServerClient()
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('transactions')
    .select('type, amount, category, description, date')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: false })

  const rows = data ?? []
  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return { income, expense, balance: income - expense, recent: rows.slice(0, 5) }
}

async function getMonthlyData(userId: string) {
  const supabase = await createSupabaseServerClient()
  const results = []

  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(new Date(), i)
    const start = format(startOfMonth(ref), 'yyyy-MM-dd')
    const end = format(startOfMonth(subMonths(ref, -1)), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .gte('date', start)
      .lt('date', end)

    const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    results.push({ month: format(ref, 'MMM/yy', { locale: ptBR }), income, expense, balance: income - expense })
  }

  return results
}

async function getPendingTasksCount(userId: string) {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
  return count ?? 0
}

async function getUpcomingEvents(userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_calendar_token')
    .eq('id', userId)
    .single()

  if (!profile?.google_calendar_token) return []

  try {
    const events = await listCalendarEvents(profile.google_calendar_token as CalendarToken, 7)
    return events.slice(0, 3)
  } catch {
    return []
  }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function OverviewPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [summary, monthlyData, pendingCount, upcomingEvents] = await Promise.all([
    getFinancialSummary(user.id),
    getMonthlyData(user.id),
    getPendingTasksCount(user.id),
    getUpcomingEvents(user.id),
  ])

  const cards = [
    {
      label: 'Saldo do mês',
      value: fmt(summary.balance),
      icon: Wallet,
      color: summary.balance >= 0 ? '#10B981' : '#F43F5E',
      sub: 'mês atual',
    },
    {
      label: 'Entradas',
      value: fmt(summary.income),
      icon: TrendingUp,
      color: '#10B981',
      sub: 'mês atual',
    },
    {
      label: 'Saídas',
      value: fmt(summary.expense),
      icon: TrendingDown,
      color: '#F43F5E',
      sub: 'mês atual',
    },
    {
      label: 'Tarefas pendentes',
      value: String(pendingCount),
      icon: CheckSquare,
      color: '#8B5CF6',
      sub: 'pendentes + em andamento',
    },
  ]

  return (
    <div className="overview">
      {/* Cards */}
      <div className="overview-cards">
        {cards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">{label}</span>
              <div className="stat-card-icon" style={{ color }}>
                <Icon size={18} />
              </div>
            </div>
            <p className="stat-card-value">{value}</p>
            <p className="stat-card-sub">{sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico + Eventos */}
      <div className="overview-middle">
        <div className="overview-chart-card">
          <h2 className="section-title">Evolução financeira</h2>
          <p className="section-sub">Entradas e saldo — últimos 6 meses</p>
          <FinancialChart data={monthlyData} />
        </div>

        <div className="overview-events-card">
          <h2 className="section-title">
            <CalendarDays size={16} />
            Próximos eventos
          </h2>
          {upcomingEvents.length === 0 ? (
            <p className="empty-state">Nenhum evento próximo ou Google Calendar não conectado.</p>
          ) : (
            <ul className="events-list">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="event-item">
                  <div className="event-dot" />
                  <div>
                    <p className="event-title">{e.title}</p>
                    <p className="event-meta">
                      {format(new Date(`${e.date}T${e.time}`), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Últimas transações */}
      <div className="overview-transactions">
        <h2 className="section-title">Últimas transações</h2>
        {summary.recent.length === 0 ? (
          <p className="empty-state">Nenhuma transação este mês.</p>
        ) : (
          <div className="transactions-list">
            {summary.recent.map((t, i) => (
              <div key={i} className="transaction-row">
                <div className={`transaction-dot transaction-dot--${t.type}`} />
                <div className="transaction-info">
                  <p className="transaction-desc">{t.description || t.category}</p>
                  <p className="transaction-meta">
                    {t.category} · {format(new Date(t.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </p>
                </div>
                <p className={`transaction-amount transaction-amount--${t.type}`}>
                  {t.type === 'expense' ? '−' : '+'}{fmt(Number(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
