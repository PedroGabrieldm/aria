import { google } from 'googleapis'
import { addMinutes, parseISO, formatISO } from 'date-fns'

export interface CalendarToken {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
  scope: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  endTime: string    // HH:MM
  description?: string
  htmlLink?: string
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  )
}

// ── URL de autorização (redireciona o usuário para o Google) ──────────────────
export function getAuthUrl(userId: string): string {
  const oauth2 = createOAuthClient()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: userId,
  })
}

// ── Troca o code pelo token e retorna o token completo ────────────────────────
export async function exchangeCodeForToken(code: string): Promise<CalendarToken> {
  const oauth2 = createOAuthClient()
  const { tokens } = await oauth2.getToken(code)
  return tokens as CalendarToken
}

// ── Cria cliente autenticado a partir do token salvo no perfil ────────────────
function createAuthenticatedClient(token: CalendarToken) {
  const oauth2 = createOAuthClient()
  oauth2.setCredentials(token)
  return google.calendar({ version: 'v3', auth: oauth2 })
}

// ── Criar evento ──────────────────────────────────────────────────────────────
export async function createCalendarEvent(
  token: CalendarToken,
  params: {
    title: string
    date: string        // YYYY-MM-DD
    time: string        // HH:MM
    duration_minutes?: number
    description?: string
  }
): Promise<CalendarEvent> {
  const calendar = createAuthenticatedClient(token)

  const startISO = formatISO(parseISO(`${params.date}T${params.time}:00`))
  const endISO = formatISO(addMinutes(parseISO(`${params.date}T${params.time}:00`), params.duration_minutes ?? 60))

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: params.title,
      description: params.description,
      start: { dateTime: startISO, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endISO, timeZone: 'America/Sao_Paulo' },
    },
  })

  return parseGoogleEvent(data)
}

// ── Listar eventos ─────────────────────────────────────────────────────────────
export async function listCalendarEvents(
  token: CalendarToken,
  daysAhead = 7
): Promise<CalendarEvent[]> {
  const calendar = createAuthenticatedClient(token)

  const now = new Date()
  const until = new Date(now)
  until.setDate(until.getDate() + daysAhead)

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  })

  return (data.items ?? [])
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map(parseGoogleEvent)
}

// ── Parser interno ─────────────────────────────────────────────────────────────
function parseGoogleEvent(event: {
  id?: string | null
  summary?: string | null
  description?: string | null
  htmlLink?: string | null
  start?: { dateTime?: string | null; date?: string | null }
  end?: { dateTime?: string | null; date?: string | null }
}): CalendarEvent {
  const startRaw = event.start?.dateTime ?? event.start?.date ?? ''
  const endRaw = event.end?.dateTime ?? event.end?.date ?? ''

  const startDate = startRaw ? new Date(startRaw) : new Date()
  const endDate = endRaw ? new Date(endRaw) : new Date()

  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    id: event.id ?? '',
    title: event.summary ?? '(sem título)',
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    time: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    description: event.description ?? undefined,
    htmlLink: event.htmlLink ?? undefined,
  }
}
