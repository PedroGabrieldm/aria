import { createSupabaseServerClient } from '@/lib/supabase/server'
import { FinanceiroClient } from '@/components/dashboard/FinanceiroClient'
import { startOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
    results.push({ month: format(ref, 'MMM/yy', { locale: ptBR }), income, expense })
  }

  return results
}

async function getInitialCategory(userId: string) {
  const supabase = await createSupabaseServerClient()
  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', start)

  const byCategory: Record<string, number> = {}
  ;(data ?? []).forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount)
  })

  return Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))
}

export default async function FinanceiroPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [monthlyData, categoryData] = await Promise.all([
    getMonthlyData(user.id),
    getInitialCategory(user.id),
  ])

  return (
    <FinanceiroClient
      initialMonthly={monthlyData}
      initialCategory={categoryData}
    />
  )
}
