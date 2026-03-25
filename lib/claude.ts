import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt } from '@/prompts/system'
import { lancarTransacao, consultarFinanceiro } from '@/lib/tools/financial'
import { criarTarefa, listarTarefas } from '@/lib/tools/tasks'
import { criarEvento, listarAgenda } from '@/lib/tools/calendar'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'lancar_transacao',
    description: 'Lança uma entrada ou saída no controle financeiro do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['income', 'expense'], description: 'Tipo: receita ou despesa' },
        amount: { type: 'number', description: 'Valor em reais' },
        category: { type: 'string', description: 'Categoria (ex: Alimentação, Transporte, Saúde, Lazer, Renda)' },
        description: { type: 'string', description: 'Descrição curta da transação' },
        date: { type: 'string', description: 'Data no formato YYYY-MM-DD. Se não informado, usar hoje.' },
      },
      required: ['type', 'amount', 'category'],
    },
  },
  {
    name: 'consultar_financeiro',
    description: 'Consulta resumo financeiro: total de entradas, saídas, saldo e gastos por categoria',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: 'Período da consulta' },
      },
      required: ['period'],
    },
  },
  {
    name: 'criar_evento',
    description: 'Cria um evento no Google Calendar do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Título do evento' },
        date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        time: { type: 'string', description: 'Horário no formato HH:MM' },
        duration_minutes: { type: 'number', description: 'Duração em minutos (padrão: 60)' },
        description: { type: 'string', description: 'Descrição ou notas do evento' },
      },
      required: ['title', 'date', 'time'],
    },
  },
  {
    name: 'listar_agenda',
    description: 'Lista os próximos eventos da agenda do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: { type: 'number', description: 'Quantos dias à frente buscar (padrão: 7)' },
      },
    },
  },
  {
    name: 'criar_tarefa',
    description: 'Cria uma tarefa ou lembrete para o usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        description: { type: 'string', description: 'Detalhes adicionais' },
        due_date: { type: 'string', description: 'Prazo no formato ISO 8601 (ex: 2024-12-25T18:00:00)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'listar_tarefas',
    description: 'Lista as tarefas pendentes ou em andamento do usuário',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'all'], description: 'Filtro de status' },
      },
    },
  },
]

interface ProcessMessageParams {
  userId: string
  userMessage: string
  history: Array<{ role: string; content: string }>
  mediaType: 'text' | 'audio' | 'image'
}

async function executeTool(userId: string, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'lancar_transacao':
      return lancarTransacao(userId, input as unknown as Parameters<typeof lancarTransacao>[1])
    case 'consultar_financeiro':
      return consultarFinanceiro(userId, input as unknown as Parameters<typeof consultarFinanceiro>[1])
    case 'criar_evento':
      return criarEvento(userId, input as unknown as Parameters<typeof criarEvento>[1])
    case 'listar_agenda':
      return listarAgenda(userId, input as unknown as Parameters<typeof listarAgenda>[1])
    case 'criar_tarefa':
      return criarTarefa(userId, input as unknown as Parameters<typeof criarTarefa>[1])
    case 'listar_tarefas':
      return listarTarefas(userId, input as unknown as Parameters<typeof listarTarefas>[1])
    default:
      return `Ferramenta desconhecida: ${name}`
  }
}

export async function processMessage({
  userId,
  userMessage,
  history,
  mediaType,
}: ProcessMessageParams): Promise<string> {
  // Monta histórico no formato esperado pela API
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Adiciona contexto de mídia ao conteúdo se necessário
  const content = mediaType === 'audio'
    ? `[mensagem de voz transcrita] ${userMessage}`
    : userMessage

  messages.push({ role: 'user', content })

  // Loop de tool use — máximo 5 rodadas para evitar loops infinitos
  for (let round = 0; round < 5; round++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: getSystemPrompt(),
      tools: TOOLS,
      messages,
    })

    // Sem tool use — retorna texto final
    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b) => b.type === 'text')
      return textBlock ? (textBlock as Anthropic.TextBlock).text : 'Não entendi. Pode repetir?'
    }

    // Adiciona a resposta do assistente (com blocos tool_use) ao histórico
    messages.push({ role: 'assistant', content: response.content })

    // Executa cada ferramenta solicitada e coleta os resultados
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const result = await executeTool(userId, block.name, block.input as Record<string, unknown>)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      })
    }

    // Adiciona resultados ao histórico e continua o loop
    messages.push({ role: 'user', content: toolResults })
  }

  return 'Desculpe, não consegui processar sua solicitação agora. Tente novamente.'
}
