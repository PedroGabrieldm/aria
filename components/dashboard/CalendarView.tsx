'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, ExternalLink } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  endTime: string
  description?: string
  htmlLink?: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EVENT_COLORS = [
  '#8B5CF6', '#10B981', '#F59E0B', '#60A5FA', '#F43F5E', '#A78BFA', '#FB923C',
]

function colorForEvent(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  return EVENT_COLORS[hash % EVENT_COLORS.length]
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [connected, setConnected] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar?days_ahead=60')
      const data = await res.json()
      if (data.connected === false) { setConnected(false); return }
      setConnected(true)
      setEvents(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Dias do grid do mês atual (inclui dias do mês anterior/próximo para completar semanas)
  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function eventsOnDay(day: Date) {
    return events.filter((e) => isSameDay(parseISO(e.date), day))
  }

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : []

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        date: form.get('date'),
        time: form.get('time'),
        duration_minutes: Number(form.get('duration') ?? 60),
        description: form.get('description') || undefined,
      }),
    })

    if (res.ok) {
      setShowModal(false)
      fetchEvents()
    } else {
      const data = await res.json()
      setCreateError(data.error ?? 'Erro ao criar evento.')
    }
    setCreating(false)
  }

  return (
    <div className="agenda">
      {/* Header do calendário */}
      <div className="agenda-header">
        <div className="agenda-nav">
          <button className="nav-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="agenda-month">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button className="nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="agenda-toolbar-right">
          {loading && <span className="agenda-loading">Carregando…</span>}
          {!connected && (
            <a href="/dashboard/configuracoes" className="agenda-connect-hint">
              Conectar Google Calendar →
            </a>
          )}
          <button className="btn-primary" onClick={() => setShowModal(true)} disabled={!connected}>
            <Plus size={16} /> Novo evento
          </button>
        </div>
      </div>

      <div className="agenda-body">
        {/* Grid do calendário */}
        <div className="calendar-grid-wrap">
          {/* Cabeçalho dos dias da semana */}
          <div className="calendar-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
          </div>

          {/* Células dos dias */}
          <div className="calendar-grid">
            {days.map((day) => {
              const dayEvents = eventsOnDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  className={[
                    'calendar-day',
                    !isCurrentMonth && 'calendar-day--outside',
                    isSelected && 'calendar-day--selected',
                    isCurrentDay && 'calendar-day--today',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="calendar-day-num">{format(day, 'd')}</span>
                  <div className="calendar-day-dots">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="calendar-dot"
                        style={{ background: colorForEvent(ev.id) }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="calendar-dot-more">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de eventos do dia selecionado */}
        <div className="agenda-sidebar">
          <h3 className="agenda-sidebar-title">
            {selectedDay
              ? format(selectedDay, "d 'de' MMMM", { locale: ptBR })
              : 'Selecione um dia'}
          </h3>

          {!connected ? (
            <p className="empty-state">Google Calendar não conectado.</p>
          ) : selectedDayEvents.length === 0 ? (
            <p className="empty-state">Nenhum evento neste dia.</p>
          ) : (
            <ul className="agenda-event-list">
              {selectedDayEvents.map((ev) => (
                <li key={ev.id} className="agenda-event-item">
                  <div
                    className="agenda-event-bar"
                    style={{ background: colorForEvent(ev.id) }}
                  />
                  <div className="agenda-event-info">
                    <p className="agenda-event-title">{ev.title}</p>
                    <p className="agenda-event-time">
                      {ev.time} – {ev.endTime}
                    </p>
                    {ev.description && (
                      <p className="agenda-event-desc">{ev.description}</p>
                    )}
                  </div>
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="agenda-event-link"
                      aria-label="Abrir no Google Calendar"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal novo evento */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Novo evento</h2>
            <form onSubmit={handleCreateEvent} className="modal-form">
              <div className="form-group">
                <label>Título</label>
                <input name="title" type="text" required placeholder="Nome do evento" />
              </div>
              <div className="modal-row">
                <div className="form-group">
                  <label>Data</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={
                      selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input name="time" type="time" required defaultValue="09:00" />
                </div>
              </div>
              <div className="form-group">
                <label>Duração (minutos)</label>
                <input name="duration" type="number" min="15" defaultValue="60" />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input name="description" type="text" placeholder="Opcional" />
              </div>
              {createError && <p className="auth-error">{createError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Criando…' : 'Criar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
