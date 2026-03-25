import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent, listCalendarEvents, type CalendarToken } from '@/lib/google-calendar'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CriarEventoInput {
  title: string
  date: string
  time: string
  duration_minutes?: number
  description?: string
}

interface ListarAgendaInput {
  days_ahead?: number
}

async function getCalendarToken(userId: string): Promise<CalendarToken | null> {
  const supabase = createSupabaseAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_calendar_token')
    .eq('id', userId)
    .single()
  return (profile?.google_calendar_token as CalendarToken) ?? null
}

export async function criarEvento(userId: string, input: CriarEventoInput): Promise<string> {
  const token = await getCalendarToken(userId)
  if (!token) {
    return '📅 Para criar eventos, conecte seu Google Calendar nas Configurações do dashboard.'
  }

  try {
    const event = await createCalendarEvent(token, input)
    return `📅 Evento criado: "${event.title}" em ${input.date} às ${input.time}.`
  } catch {
    return 'Não consegui criar o evento. Verifique se o Google Calendar ainda está conectado.'
  }
}

export async function listarAgenda(userId: string, input: ListarAgendaInput): Promise<string> {
  const token = await getCalendarToken(userId)
  if (!token) {
    return '📅 Para ver sua agenda, conecte o Google Calendar nas Configurações do dashboard.'
  }

  try {
    const daysAhead = input.days_ahead ?? 7
    const events = await listCalendarEvents(token, daysAhead)

    if (events.length === 0) {
      return `Nenhum evento nos próximos ${daysAhead} dias.`
    }

    const lines = events.slice(0, 5).map((e) => {
      const dateLabel = format(parseISO(e.date), "dd/MM (EEE)", { locale: ptBR })
      return `📅 ${dateLabel} ${e.time} — ${e.title}`
    })

    return `Próximos eventos:\n${lines.join('\n')}`
  } catch {
    return 'Não consegui acessar sua agenda agora. Tente novamente.'
  }
}
