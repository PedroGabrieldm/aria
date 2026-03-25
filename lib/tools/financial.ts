import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns'

interface LancarTransacaoInput {
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  date?: string
}

interface ConsultarFinanceiroInput {
  period: 'today' | 'week' | 'month' | 'year'
}

export async function lancarTransacao(userId: string, input: LancarTransacaoInput): Promise<string> {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description ?? null,
    date: input.date ?? format(new Date(), 'yyyy-MM-dd'),
  })

  if (error) return `Erro ao lançar transação: ${error.message}`

  const typeLabel = input.type === 'income' ? 'Receita' : 'Despesa'
  const amountFmt = input.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return `${typeLabel} de ${amountFmt} em "${input.category}" registrada com sucesso.`
}

export async function consultarFinanceiro(userId: string, input: ConsultarFinanceiroInput): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const now = new Date()

  const startMap: Record<string, Date> = {
    today: startOfDay(now),
    week: startOfWeek(now, { weekStartsOn: 0 }),
    month: startOfMonth(now),
    year: startOfYear(now),
  }

  const startDate = format(startMap[input.period], 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, category')
    .eq('user_id', userId)
    .gte('date', startDate)

  if (error) return `Erro ao consultar financeiro: ${error.message}`
  if (!data || data.length === 0) return 'Nenhuma transação encontrada no período.'

  const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expense

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const byCategory: Record<string, number> = {}
  data.filter((t) => t.type === 'expense').forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount)
  })

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, val]) => `${cat}: ${fmt(val)}`)
    .join(', ')

  const periodLabel = { today: 'hoje', week: 'esta semana', month: 'este mês', year: 'este ano' }[input.period]

  return [
    `📊 Resumo ${periodLabel}:`,
    `Entradas: ${fmt(income)}`,
    `Saídas: ${fmt(expense)}`,
    `Saldo: ${fmt(balance)}`,
    topCategories ? `Top gastos: ${topCategories}` : '',
  ].filter(Boolean).join('\n')
}
