import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Query params:
//   status=pending|in_progress|done|all  (padrão: all)
//   limit=100
//   offset=0
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'all'
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  let query = supabase
    .from('tasks')
    .select('id, title, description, status, due_date, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, due_date } = body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'title é obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description ?? null,
      due_date: due_date ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// ─── PATCH /api/tasks ─────────────────────────────────────────────────────────
// Body: { id, status?, title?, description?, due_date? }
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, title, description, due_date } = body

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const validStatuses = ['pending', 'in_progress', 'done']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status deve ser: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description
  if (due_date !== undefined) updates.due_date = due_date

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // garante que só atualiza o próprio dado
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// ─── DELETE /api/tasks?id=xxx ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
