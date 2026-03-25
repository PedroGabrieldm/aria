# Aria — Progresso de Implementação

## Stack
- Next.js **16.2.1** + React 19 + TypeScript
- Supabase (DB + Auth + RLS)
- Anthropic Claude API (`claude-sonnet-4-5`) com Tool Use
- OpenAI Whisper (transcrição de áudio)
- Evolution API (WhatsApp)
- Google Calendar API
- Tailwind CSS v4 + next-themes + sonner + lucide-react + recharts
- @dnd-kit (kanban drag-and-drop)

## Atenção — Next.js 16 (breaking changes vs 14)
- `cookies()`, `headers()`, `params` são **async** — sempre `await`
- `next build` não roda linter automaticamente
- Turbopack é o bundler padrão
- Estilos: Tailwind v4 usa `@theme` no CSS, sem `tailwind.config.js`
- Fontes: usar variáveis CSS `--font-geist`, `--font-dm-sans` definidas no layout

## Passos

### ✅ Passo 1 — Setup inicial
- `.env.local` criado com todas as variáveis (preenchido pelo usuário)
- `supabase/migrations/001_initial.sql` — tabelas: `profiles`, `transactions`, `tasks`, `messages` com RLS
- Migration aplicada pelo usuário no Supabase Dashboard

### ✅ Passo 2 — Auth
- `lib/supabase/client.ts` — `createSupabaseBrowserClient()`
- `lib/supabase/server.ts` — `createSupabaseServerClient()` e `createSupabaseServiceClient()` (async cookies)
- `middleware.ts` — protege `/dashboard/*`, redireciona auth pages se logado
- `app/actions/auth.ts` — Server Actions: `login`, `register` (cria profile), `logout`
- `app/(auth)/login/page.tsx` e `app/(auth)/register/page.tsx`
- `app/layout.tsx` — DM Sans + Geist + ThemeProvider
- `app/page.tsx` — redirect `/` → `/dashboard`

### ✅ Passo 3 — Layout do Dashboard
- `components/dashboard/ThemeProvider.tsx` — next-themes com `data-theme`
- `components/dashboard/ThemeToggle.tsx` — botão sol/lua
- `components/dashboard/Sidebar.tsx` — nav com link ativo, logout, avatar, plano
- `components/dashboard/Header.tsx` — título dinâmico por rota, hamburger mobile
- `components/dashboard/DashboardShell.tsx` — controla estado do sidebar mobile
- `app/(dashboard)/layout.tsx` — Server Component: busca perfil, passa ao Shell
- `app/globals.css` — variáveis CSS dark/light, estilos auth + dashboard completos

### ✅ Passo 4 — Webhook WhatsApp
- `app/api/webhook/route.ts` — detecta texto/áudio/imagem, ignora grupos e fromMe, busca perfil por número, salva histórico, chama Claude, responde

### ✅ Passo 5 — Whisper (transcrição de áudio)
- `lib/whisper.ts` — baixa áudio, salva em `/tmp`, transcreve com `whisper-1`, deleta

### ✅ Passo 6 — Claude Tool Use
- `lib/supabase/admin.ts` — client admin sem cookies (para webhook)
- `lib/evolution.ts` — `sendWhatsAppMessage()`
- `prompts/system.ts` — system prompt do Ari em PT-BR
- `lib/tools/financial.ts` — `lancarTransacao`, `consultarFinanceiro`
- `lib/tools/tasks.ts` — `criarTarefa`, `listarTarefas`
- `lib/tools/calendar.ts` — stub (detecta se Google Calendar está conectado)
- `lib/claude.ts` — `processMessage()` com loop tool use (até 5 rodadas), Anthropic SDK v0.80.0

---

### ✅ Passo 7 — API REST Financeiro
- `app/api/financial/route.ts` — GET/POST/DELETE
  - `GET ?view=summary&period=month` → totais + categoryBreakdown + últimas 5 transações
  - `GET ?view=transactions&period=...&category=...&type=...&limit=...&offset=...` → lista paginada
  - `GET ?view=monthly&months=6` → agregado por mês para gráficos
  - `POST` → criar transação (valida type, amount, category)
  - `DELETE ?id=xxx` → deletar (com guard `user_id`)

### ✅ Passo 8 — API REST Tarefas
- `app/api/tasks/route.ts` — GET/POST/PATCH/DELETE
  - `GET ?status=all|pending|in_progress|done&limit=...&offset=...` → lista
  - `POST` → criar tarefa (valida title)
  - `PATCH` → atualizar status/title/description/due_date por id
  - `DELETE ?id=xxx` → deletar (com guard user_id)

### ✅ Passo 9 — Google Calendar
- `lib/google-calendar.ts` — OAuth2 client, `getAuthUrl()`, `exchangeCodeForToken()`, `createCalendarEvent()`, `listCalendarEvents()`
- `app/api/auth/callback/google/route.ts` — recebe code+state, troca por token, salva no profile
- `app/api/calendar/route.ts`
  - `GET ?action=auth-url` → URL OAuth
  - `GET ?days_ahead=7` → lista eventos (detecta token expirado e limpa)
  - `POST` → criar evento
  - `DELETE` → desconectar (limpa token do profile)
- `lib/tools/calendar.ts` — completo com chamadas reais ao Google Calendar

### ✅ Passo 10 — Página Overview (`/dashboard`)
- `app/(dashboard)/page.tsx` — Server Component, busca dados em paralelo (Promise.all)
- `components/dashboard/FinancialChart.tsx` — AreaChart Recharts v3 (entradas + saldo 6 meses)
- Cards: Saldo do mês, Entradas, Saídas, Tarefas pendentes
- Grid: gráfico (flex) + próximos 3 eventos (320px fixo)
- Últimas 5 transações com dot colorido (verde/vermelho)

### ✅ Passo 11 — Página Financeiro (`/dashboard/financeiro`)
- `app/(dashboard)/financeiro/page.tsx` — Server Component, busca dados iniciais
- `components/dashboard/FinanceiroClient.tsx` — Client Component com filtros, tabela, modal
- `components/dashboard/FinancialBarChart.tsx` — BarChart entradas vs saídas
- `components/dashboard/CategoryPieChart.tsx` — PieChart gastos por categoria (donut)
- Cards: Receitas, Despesas, Saldo, Economia %
- Tabela paginada com filtros de período/categoria/tipo + skeleton loading
- Modal para lançar transação manual com validação

### ✅ Passo 12 — Página Agenda (`/dashboard/agenda`)
- `app/(dashboard)/agenda/page.tsx` — Server Component mínimo
- `components/dashboard/CalendarView.tsx` — Client Component completo:
  - Grid mensal com navegação prev/next
  - Dots coloridos por evento (cor determinística por id)
  - Clique no dia exibe eventos na sidebar
  - Detecta Google Calendar desconectado e exibe link de configuração
  - Modal para criar evento com data pré-preenchida pelo dia selecionado
  - Link externo para abrir evento no Google Calendar

### ✅ Passo 13 — Página Tarefas (`/dashboard/tarefas`)
- Estilo Microsoft To Do (decisão do usuário — mais prático que kanban)
- `components/dashboard/TaskList.tsx` — Client Component completo:
  - Lista de pendentes com checkbox circular
  - Seção "Concluída N" colapsável
  - Quick add no rodapé (Enter para adicionar)
  - Painel de detalhes lateral ao clicar na tarefa:
    - Editar título inline (blur para salvar)
    - Picker de data de prazo
    - Campo de anotação (blur para salvar)
    - Excluir tarefa
  - Badge de prazo vencido em vermelho
  - Otimistic UI (atualização instantânea antes da resposta da API)

### ✅ Passo 14 — Configurações (`/dashboard/configuracoes`)
- `app/(dashboard)/configuracoes/page.tsx` — Server Component (busca perfil, envolve em Suspense para useSearchParams)
- `app/actions/profile.ts` — Server Action: `updateProfile()` com revalidatePath
- `app/api/whatsapp/status/route.ts` — GET: verifica estado da instância na Evolution API, retorna QR code se desconectado
- `components/dashboard/ConfiguracoesClient.tsx` — 4 seções:
  - Perfil: nome, email (read-only), número WhatsApp
  - WhatsApp: status badge + QR code para conectar
  - Google Calendar: conectar/desconectar via OAuth, feedback via ?calendar=success|error
  - Plano: cards Free / Pro / Business com badge "Atual"

### ✅ Passo 15 — Polish (mobile-first)
- **Sonner toasts**: `<Toaster />` no root layout; toasts de sucesso/erro em TaskList, FinanceiroClient e ConfiguracoesClient
- **Bottom nav mobile**: `BottomNav.tsx` fixo na base da tela em `<=768px` com 5 ítens (Overview, Financeiro, Agenda, Tarefas, Config) — item ativo destacado em accent
- **Loading skeletons**: `loading.tsx` em todas as 5 rotas do dashboard (Overview, Financeiro, Agenda, Tarefas, Config) — animação shimmer
- **Animações**: `fadeInUp` nas páginas, stagger nos cards, `slideUp` no painel de detalhes mobile, `fadeIn` nos modais
- **Mobile-first CSS**:
  - Toolbar do Financeiro vira coluna em mobile
  - Tabela de transações esconde colunas data/categoria em telas pequenas
  - `todo-detail` vira drawer bottom em mobile (acima da bottom nav)
  - CalendarView sidebar vai para baixo em mobile
  - `dashboard-content` com `padding-bottom` extra para não ficar atrás da bottom nav
  - Suporte a `safe-area-inset-bottom` (notch iPhone)
  - Ajustes para extra small (≤400px)
- **Error boundary**: `error.tsx` no grupo `(dashboard)` com botão "Tentar novamente"

---

## Arquitetura de arquivos atual

```
assistente-ia/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ✅
│   │   └── register/page.tsx       ✅
│   ├── (dashboard)/
│   │   ├── layout.tsx              ✅
│   │   ├── page.tsx                ✅ (placeholder)
│   │   ├── financeiro/             ⬜ (página — Passo 11)
│   │   ├── api/financial/route.ts  ✅
│   │   ├── agenda/                 ⬜
│   │   ├── tarefas/                ⬜
│   │   └── configuracoes/          ⬜
│   ├── actions/
│   │   └── auth.ts                 ✅
│   ├── api/
│   │   ├── webhook/route.ts        ✅
│   │   ├── financial/route.ts      ⬜
│   │   ├── tasks/route.ts          ⬜
│   │   └── calendar/route.ts       ⬜
│   ├── globals.css                 ✅
│   ├── layout.tsx                  ✅
│   └── page.tsx                    ✅
├── components/
│   └── dashboard/
│       ├── DashboardShell.tsx      ✅
│       ├── Header.tsx              ✅
│       ├── Sidebar.tsx             ✅
│       ├── ThemeProvider.tsx       ✅
│       ├── ThemeToggle.tsx         ✅
│       ├── FinancialChart.tsx      ⬜
│       ├── CategoryPieChart.tsx    ⬜
│       ├── CalendarView.tsx        ⬜
│       └── TaskKanban.tsx          ⬜
├── lib/
│   ├── supabase/
│   │   ├── admin.ts                ✅
│   │   ├── client.ts               ✅
│   │   └── server.ts               ✅
│   ├── tools/
│   │   ├── financial.ts            ✅
│   │   ├── tasks.ts                ✅
│   │   └── calendar.ts             ✅ (stub)
│   ├── claude.ts                   ✅
│   ├── evolution.ts                ✅
│   └── whisper.ts                  ✅
├── prompts/
│   └── system.ts                   ✅
├── supabase/
│   └── migrations/
│       └── 001_initial.sql         ✅
├── .env.local                      ✅ (preenchido)
├── middleware.ts                   ✅
├── PROGRESS.md                     ✅
└── CLAUDE.md / AGENTS.md           ✅
```

## Variáveis de ambiente — status
| Variável | Status |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ |
| ANTHROPIC_API_KEY | ✅ |
| OPENAI_API_KEY | ⬜ (pendente) |
| EVOLUTION_API_URL | ⬜ (pendente) |
| EVOLUTION_API_KEY | ⬜ (pendente) |
| EVOLUTION_INSTANCE | ⬜ (pendente) |
| GOOGLE_CLIENT_ID | ⬜ (pendente) |
| GOOGLE_CLIENT_SECRET | ⬜ (pendente) |
| NEXT_PUBLIC_APP_URL | ⬜ (pendente) |
| WEBHOOK_SECRET | ⬜ (pendente) |
