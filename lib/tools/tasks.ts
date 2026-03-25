import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CriarTarefaInput {
  title: string
  description?: string
  due_date?: string
}

interface ListarTarefasInput {
  status?: 'pending' | 'in_progress' | 'all'
}

export async function criarTarefa(userId: string, input: CriarTarefaInput): Promise<string> {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from('tasks').insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    due_date: input.due_date ?? null,
    status: 'pending',
  })

  if (error) return `Erro ao criar tarefa: ${error.message}`

  const prazo = input.due_date
    ? ` — prazo: ${format(parseISO(input.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    : ''

  return `✏️ Tarefa criada: "${input.title}"${prazo}`
}

export async function listarTarefas(userId: string, input: ListarTarefasInput): Promise<string> {
  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('tasks')
    .select('title, status, due_date')
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (!input.status || input.status !== 'all') {
    const statusFilter = input.status ?? 'pending'
    if (statusFilter === 'pending') {
      query = query.in('status', ['pending', 'in_progress'])
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  const { data, error } = await query.limit(10)

  if (error) return `Erro ao listar tarefas: ${error.message}`
  if (!data || data.length === 0) return 'Nenhuma tarefa encontrada.'

  const statusLabel: Record<string, string> = {
    pending: '⏳',
    in_progress: '🔄',
    done: '✅',
  }

  const lines = data.map((t) => {
    const icon = statusLabel[t.status] ?? '•'
    const prazo = t.due_date
      ? ` (${format(parseISO(t.due_date), 'dd/MM', { locale: ptBR })})`
      : ''
    return `${icon} ${t.title}${prazo}`
  })

  return `Suas tarefas:\n${lines.join('\n')}`
}
