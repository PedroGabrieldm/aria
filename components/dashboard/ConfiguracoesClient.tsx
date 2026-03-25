'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  User, Smartphone, CalendarDays, CheckCircle2,
  XCircle, Loader2, ExternalLink, Tag, Trash2, Plus, CreditCard, Receipt
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

type TabId = 'perfil' | 'whatsapp' | 'categorias' | 'integracoes' | 'plano'

export function ConfiguracoesClient({ profile, email }: Props) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('perfil')

  // Feedback do callback OAuth do Google
  const calendarStatus = searchParams.get('calendar')

  useEffect(() => {
    if (calendarStatus) setActiveTab('integracoes')
  }, [calendarStatus])

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
    { id: 'categorias', label: 'Categorias', icon: Tag },
    { id: 'integracoes', label: 'Integrações', icon: CalendarDays },
    { id: 'plano', label: 'Assinatura', icon: CreditCard },
  ] as const

  return (
    <div className="config-layout">
      {/* Menu lateral de configurações */}
      <aside className="config-sidebar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`config-tab ${activeTab === tab.id ? 'config-tab--active' : ''}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </aside>

      {/* Conteúdo da aba */}
      <div className="config-content">
        {calendarStatus === 'success' && activeTab === 'integracoes' && (
          <div className="config-toast config-toast--success">
            ✅ Google Calendar conectado com sucesso!
          </div>
        )}
        {calendarStatus === 'error' && activeTab === 'integracoes' && (
          <div className="config-toast config-toast--error">
            ❌ Erro ao conectar o Google Calendar. Tente novamente.
          </div>
        )}

        {activeTab === 'perfil' && <ProfileSection profile={profile} email={email} />}
        {activeTab === 'whatsapp' && <WhatsAppSection number={profile.whatsapp_number} />}
        {activeTab === 'categorias' && <CategoriesSection />}
        {activeTab === 'integracoes' && <GoogleCalendarSection connected={profile.google_calendar_connected} />}
        {activeTab === 'plano' && <PlanSection plan={profile.plan} />}
      </div>
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

// ── Categorias ────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'both'
  color: string | null
}

const TYPE_LABELS: Record<Category['type'], string> = {
  income: 'Receita',
  expense: 'Despesa',
  both: 'Ambos',
}

const PRESET_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Salário', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investimentos', type: 'income' },
  { name: 'Vendas', type: 'income' },
  { name: 'Bônus', type: 'income' },
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Roupas', type: 'expense' },
  { name: 'Assinaturas', type: 'expense' },
  { name: 'Contas', type: 'expense' },
]

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [type, setType] = useState<Category['type']>('both')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => { setCategories(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function addCategory(catName: string, catType: Category['type']) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, type: catType }),
    })
    if (res.ok) {
      const created: Category = await res.json()
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return true
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao criar categoria.')
      return false
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const ok = await addCategory(name.trim(), type)
    if (ok) {
      toast.success(`Categoria "${name.trim()}" criada!`)
      setName('')
    }
    setSaving(false)
  }

  async function handleAddPreset(preset: typeof PRESET_CATEGORIES[number]) {
    const alreadyExists = categories.some(
      (c) => c.name.toLowerCase() === preset.name.toLowerCase()
    )
    if (alreadyExists) {
      toast.error(`"${preset.name}" já foi adicionada.`)
      return
    }
    const ok = await addCategory(preset.name, preset.type)
    if (ok) toast.success(`"${preset.name}" adicionada!`)
  }

  async function handleDelete(id: string, catName: string) {
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      toast.success(`Categoria "${catName}" removida.`)
    } else {
      toast.error('Erro ao remover categoria.')
    }
  }

  return (
    <section className="config-section">
      <div className="config-section-header">
        <Tag size={18} />
        <h2 className="config-section-title">Categorias</h2>
      </div>

      <div className="config-categories">
        <form className="categories-add-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="categories-name-input"
            maxLength={40}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Category['type'])}
            className="categories-type-select"
          >
            <option value="both">Ambos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
          <button type="submit" className="btn-primary categories-add-btn" disabled={saving || !name.trim()}>
            {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            Adicionar
          </button>
        </form>

        <div className="categories-presets">
          <p className="categories-presets-label">Sugestões</p>
          <div className="categories-presets-list">
            {PRESET_CATEGORIES.filter(
              (p) => !categories.some((c) => c.name.toLowerCase() === p.name.toLowerCase())
            ).map((p) => (
              <button
                key={p.name}
                type="button"
                className={`categories-preset-chip categories-preset-chip--${p.type}`}
                onClick={() => handleAddPreset(p)}
              >
                <Plus size={11} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="categories-empty"><Loader2 size={16} className="spin" /> Carregando…</div>
        ) : categories.length === 0 ? (
          <div className="categories-empty">Nenhuma categoria ainda. Adicione acima ou escolha uma sugestão.</div>
        ) : (
          <ul className="categories-list">
            {categories.map((cat) => (
              <li key={cat.id} className="categories-item">
                <span className="categories-item-name">{cat.name}</span>
                <span className={`categories-type-badge categories-type-badge--${cat.type}`}>
                  {TYPE_LABELS[cat.type]}
                </span>
                <button
                  className="categories-delete-btn"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  title="Remover"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
          <p className="config-info-text" style={{ color: '#10B981' }}>
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
interface Payment {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  description: string | null
  payment_method: string | null
  paid_at: string | null
  created_at: string
}

const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
}

function PlanSection({ plan }: { plan: string }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  useEffect(() => {
    fetch('/api/payments')
      .then((r) => r.json())
      .then((data) => { setPayments(Array.isArray(data) ? data : []); setLoadingPayments(false) })
  }, [])

  const plans = [
    { id: 'free', label: 'Free', desc: '50 mensagens/mês', price: 'Grátis' },
    { id: 'pro', label: 'Pro', desc: 'Mensagens ilimitadas', price: 'Em breve' },
    { id: 'business', label: 'Business', desc: 'Múltiplos WhatsApps', price: 'Em breve' },
  ]

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="plan-tab">
      <section className="config-section">
        <div className="config-section-header">
          <CreditCard size={18} />
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

      <section className="config-section">
        <div className="config-section-header">
          <Receipt size={18} />
          <h2 className="config-section-title">Histórico de pagamentos</h2>
        </div>

        {loadingPayments ? (
          <div className="payments-empty"><Loader2 size={16} className="spin" /> Carregando…</div>
        ) : payments.length === 0 ? (
          <div className="payments-empty">Nenhum pagamento registrado.</div>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Método</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="payments-date">{formatDate(p.paid_at ?? p.created_at)}</td>
                  <td>{p.description ?? '—'}</td>
                  <td>{p.payment_method ? (METHOD_LABELS[p.payment_method] ?? p.payment_method) : '—'}</td>
                  <td className="payments-amount">{formatAmount(p.amount, p.currency)}</td>
                  <td>
                    <span className={`payments-status payments-status--${p.status}`}>
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
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
