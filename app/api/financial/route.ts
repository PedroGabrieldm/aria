import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths, format } from 'date-fns'

// ─── GET /api/financial ───────────────────────────────────────────────────────
// Query params:
//   view=transactions  → lista paginada de transações
//   view=summary       → totais do período (padrão)
//   view=monthly       → agregado por mês (últimos N meses, para gráficos)
//   period=today|week|month|year  (padrão: month)
//   category=string
//   type=income|expense
//   months=6           (usado com view=monthly)
//   limit=50           (usado com view=transactions)
//   offset=0
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const view = searchParams.get('view') ?? 'summary'
  const period = searchParams.get('period') ?? 'month'
  const category = searchParams.get('category')
  const typeFilter = searchParams.get('type')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)
  const months = Math.min(Number(searchParams.get('months') ?? 6), 24)

  // ── Dados mensais para gráficos ──────────────────────────────────────────
  if (view === 'monthly') {
    const results: Array<{ month: string; income: number; expense: number; balance: number }> = []

    for (let i = months - 1; i >= 0; i--) {
      const ref = subMonths(new Date(), i)
      const start = format(startOfMonth(ref), 'yyyy-MM-dd')
      const end = format(startOfMonth(subMonths(ref, -1)), 'yyyy-MM-dd')

      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', start)
        .lt('date', end)

      const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

      results.push({
        month: format(ref, 'MMM/yy'),
        income,
        expense,
        balance: income - expense,
      })
    }

    return NextResponse.json({ data: results })
  }

  // ── Período base ─────────────────────────────────────────────────────────
  const now = new Date()
  const startMap: Record<string, Date> = {
    today: startOfDay(now),
    week: startOfWeek(now, { weekStartsOn: 0 }),
    month: startOfMonth(now),
    year: startOfYear(now),
  }
  const startDate = format(startMap[period] ?? startOfMonth(now), 'yyyy-MM-dd')

  // ── Query base ────────────────────────────────────────────────────────────
  let query = supabase
    .from('transactions')
    .select('id, type, amount, category, description, date, created_at')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .order('date', { ascending: false })

  if (category) query = query.eq('category', category)
  if (typeFilter) query = query.eq('type', typeFilter)

  // ── Lista de transações ───────────────────────────────────────────────────
  if (view === 'transactions') {
    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, total: count })
  }

  // ── Resumo (summary) ──────────────────────────────────────────────────────
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Totais por categoria (apenas despesas)
  const byCategory: Record<string, number> = {}
  ;(data ?? [])
    .filter((t) => t.type === 'expense')
    .forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount) })

  const categoryBreakdown = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // Últimas 5 transações para o overview
  const recent = (data ?? []).slice(0, 5)

  return NextResponse.json({
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    categoryBreakdown,
    recent,
  })
}

// ─── POST /api/financial ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, amount, category, description, date } = body

  if (!type || !amount || !category) {
    return NextResponse.json({ error: 'type, amount e category são obrigatórios' }, { status: 400 })
  }

  if (!['income', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'type deve ser income ou expense' }, { status: 400 })
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount deve ser um número positivo' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type,
      amount,
      category,
      description: description ?? null,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// ─── DELETE /api/financial?id=xxx ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // garante que só deleta o próprio dado

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
