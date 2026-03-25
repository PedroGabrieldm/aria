'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  User, Smartphone, CalendarDays, CheckCircle2,
  XCircle, Loader2, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/profile'

interface Props {
  profile: {
    id: string
    full_name: string | null
    whatsapp_number: string | null
    plan: string
    google_calendar_connected: boolean
  }
  email: string
}

export function ConfiguracoesClient({ profile, email }: Props) {
  const searchParams = useSearchParams()

  // Feedback do callback OAuth do Google
  const calendarStatus = searchParams.get('calendar')

  return (
    <div className="config-root">
      {calendarStatus === 'success' && (
        <div className="config-toast config-toast--success">
          ✅ Google Calendar conectado com sucesso!
        </div>
      )}
      {calendarStatus === 'error' && (
        <div className="config-toast config-toast--error">
          ❌ Erro ao conectar o Google Calendar. Tente novamente.
        </div>
      )}

      <ProfileSection profile={profile} email={email} />
      <WhatsAppSection number={profile.whatsapp_number} />
      <GoogleCalendarSection connected={profile.google_calendar_connected} />
      <PlanSection plan={profile.plan} />
    </div>
  )
}

// ── Perfil ────────────────────────────────────────────────────────────────────
function ProfileSection({ profile, email }: { profile: Props['profile']; email: string }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMsg(null)
    const result = await updateProfile(formData)
    if (result.success) {
      toast.success('Perfil atualizado!')
      setMsg({ type: 'success', text: 'Perfil atualizado!' })
    } else {
      toast.error(result.error ?? 'Erro ao salvar.')
      setMsg({ type: 'error', text: result.error ?? 'Erro ao salvar.' })
    }
    setLoading(false)
  }

  return (
    <section className="config-section">
      <div className="config-section-header">
        <User size={18} />
        <h2 className="config-section-title">Perfil</h2>
      </div>

      <form action={handleSubmit} className="config-form">
        <div className="form-group">
          <label>Nome completo</label>
          <input
            name="full_name"
            type="text"
            defaultValue={profile.full_name ?? ''}
            placeholder="Seu nome"
            required
          />
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input type="email" value={email} disabled className="input-disabled" />
        </div>
        <div className="form-group">
          <label>WhatsApp (apenas números, com DDD e DDI)</label>
          <input
            name="whatsapp_number"
            type="text"
            defaultValue={profile.whatsapp_number ?? ''}
            placeholder="5511999999999"
          />
          <span className="input-hint">
            Ex: 5511999999999 · Usado para identificar sua conta no assistente
          </span>
        </div>
        {msg && (
          <p className={`config-msg config-msg--${msg.type}`}>{msg.text}</p>
        )}
        <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? <><Loader2 size={15} className="spin" /> Salvando…</> : 'Salvar alterações'}
        </button>
      </form>
    </section>
  )
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────
function WhatsAppSection({ number }: { number: string | null }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected' | 'unconfigured'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    const res = await fetch('/api/whatsapp/status')
    const data = await res.json()
    setStatus(data.status)
    setQrCode(data.qrCode ?? null)
  }, [])

  useEffect(() => { checkStatus() }, [checkStatus])

  return (
    <section className="config-section">
      <div className="config-section-header">
        <Smartphone size={18} />
        <h2 className="config-section-title">WhatsApp</h2>
      </div>

      <div className="config-card">
        <div className="config-status-row">
          <div>
            <p className="config-status-label">Status da conexão</p>
            {number && (
              <p className="config-status-sub">Número: +{number}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {status === 'disconnected' && (
          <div className="config-info">
            <p>Escaneie o QR Code com seu WhatsApp para conectar:</p>
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="QR Code WhatsApp" className="config-qr" />
            ) : (
              <button className="btn-secondary" onClick={checkStatus}>
                Gerar QR Code
              </button>
            )}
          </div>
        )}

        {status === 'unconfigured' && (
          <p className="config-info-text">
            Configure as variáveis EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env.local
            e faça o deploy para ativar o WhatsApp.
          </p>
        )}

        {status === 'connected' && (
          <p className="config-info-text" style={{ color: '#34D399' }}>
            Assistente Ari ativo e recebendo mensagens.
          </p>
        )}

        <button
          className="btn-secondary"
          onClick={checkStatus}
          style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
        >
          Verificar status
        </button>
      </div>
    </section>
  )
}

// ── Google Calendar ───────────────────────────────────────────────────────────
function GoogleCalendarSection({ connected: initialConnected }: { connected: boolean }) {
  const [connected, setConnected] = useState(initialConnected)
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch('/api/calendar?action=auth-url')
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  async function handleDisconnect() {
    setLoading(true)
    await fetch('/api/calendar', { method: 'DELETE' })
    setConnected(false)
    setLoading(false)
  }

  return (
    <section className="config-section">
      <div className="config-section-header">
        <CalendarDays size={18} />
        <h2 className="config-section-title">Google Calendar</h2>
      </div>

      <div className="config-card">
        <div className="config-status-row">
          <div>
            <p className="config-status-label">Sincronização de agenda</p>
            <p className="config-status-sub">
              {connected
                ? 'Eventos sincronizados. O assistente pode criar e listar compromissos.'
                : 'Conecte para criar eventos pelo WhatsApp e ver sua agenda no dashboard.'}
            </p>
          </div>
          <StatusBadge status={connected ? 'connected' : 'disconnected'} />
        </div>

        <div className="config-actions">
          {connected ? (
            <button className="btn-secondary" onClick={handleDisconnect} disabled={loading}>
              {loading ? <Loader2 size={14} className="spin" /> : null}
              Desconectar
            </button>
          ) : (
            <button className="btn-primary" onClick={handleConnect} disabled={loading}>
              {loading ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />}
              Conectar Google Calendar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Plano ─────────────────────────────────────────────────────────────────────
function PlanSection({ plan }: { plan: string }) {
  const plans = [
    { id: 'free', label: 'Free', desc: '50 mensagens/mês', price: 'Grátis' },
    { id: 'pro', label: 'Pro', desc: 'Mensagens ilimitadas', price: 'Em breve' },
    { id: 'business', label: 'Business', desc: 'Múltiplos WhatsApps', price: 'Em breve' },
  ]

  return (
    <section className="config-section">
      <div className="config-section-header">
        <h2 className="config-section-title">Plano atual</h2>
      </div>

      <div className="config-plans">
        {plans.map((p) => (
          <div key={p.id} className={`config-plan-card${plan === p.id ? ' config-plan-card--active' : ''}`}>
            <div className="config-plan-top">
              <span className="config-plan-name">{p.label}</span>
              {plan === p.id && <span className="config-plan-badge">Atual</span>}
            </div>
            <p className="config-plan-desc">{p.desc}</p>
            <p className="config-plan-price">{p.price}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'loading') {
    return (
      <span className="status-badge status-badge--loading">
        <Loader2 size={13} className="spin" /> Verificando
      </span>
    )
  }
  if (status === 'connected') {
    return (
      <span className="status-badge status-badge--connected">
        <CheckCircle2 size={13} /> Conectado
      </span>
    )
  }
  return (
    <span className="status-badge status-badge--disconnected">
      <XCircle size={13} /> Desconectado
    </span>
  )
}
