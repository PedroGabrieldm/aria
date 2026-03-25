import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAuthUrl, createCalendarEvent, listCalendarEvents, type CalendarToken } from '@/lib/google-calendar'

// ─── GET /api/calendar ────────────────────────────────────────────────────────
// Query params:
//   action=auth-url  → retorna a URL de autorização OAuth
//   days_ahead=7     → lista eventos dos próximos N dias
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  // Retorna URL para iniciar o OAuth flow
  if (action === 'auth-url') {
    const url = getAuthUrl(user.id)
    return NextResponse.json({ url })
  }

  // Busca o token do perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_calendar_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_calendar_token) {
    return NextResponse.json({ error: 'Google Calendar não conectado', connected: false }, { status: 200 })
  }

  const daysAhead = Number(searchParams.get('days_ahead') ?? 7)

  try {
    const events = await listCalendarEvents(profile.google_calendar_token as CalendarToken, daysAhead)
    return NextResponse.json({ data: events, connected: true })
  } catch (err) {
    // Token expirado ou revogado — limpa o perfil
    if ((err as { code?: number }).code === 401) {
      await supabase
        .from('profiles')
        .update({ google_calendar_token: null })
        .eq('id', user.id)
      return NextResponse.json({ error: 'Token expirado. Reconecte o Google Calendar.', connected: false }, { status: 200 })
    }
    return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 })
  }
}

// ─── POST /api/calendar ───────────────────────────────────────────────────────
// Body: { title, date, time, duration_minutes?, description? }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_calendar_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_calendar_token) {
    return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 })
  }

  const body = await req.json()
  const { title, date, time, duration_minutes, description } = body

  if (!title || !date || !time) {
    return NextResponse.json({ error: 'title, date e time são obrigatórios' }, { status: 400 })
  }

  try {
    const event = await createCalendarEvent(
      profile.google_calendar_token as CalendarToken,
      { title, date, time, duration_minutes, description }
    )
    return NextResponse.json({ data: event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar evento no Google Calendar' }, { status: 500 })
  }
}

// ─── DELETE /api/calendar — desconectar Google Calendar ───────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('profiles')
    .update({ google_calendar_token: null })
    .eq('id', user.id)

  return new NextResponse(null, { status: 204 })
}
