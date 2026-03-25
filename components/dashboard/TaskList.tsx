'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Plus, Calendar, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'done'
  due_date: string | null
  created_at: string
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [doneExpanded, setDoneExpanded] = useState(false)
  const [selected, setSelected] = useState<Task | null>(null)
  const [quickAdd, setQuickAdd] = useState('')
  const [adding, setAdding] = useState(false)
  const quickAddRef = useRef<HTMLInputElement>(null)

  async function fetchTasks() {
    const res = await fetch('/api/tasks?status=all&limit=200')
    const data = await res.json()
    setTasks(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  // Sincroniza o painel lateral quando a tarefa selecionada for atualizada
  useEffect(() => {
    if (selected) {
      const updated = tasks.find((t) => t.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleDone(task: Task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    if (selected?.id === task.id) setSelected((s) => s ? { ...s, status: newStatus } : s)
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    })
    if (newStatus === 'done') toast.success('Tarefa concluída!')
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (selected?.id === id) setSelected(null)
    await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
    toast.success('Tarefa excluída.')
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    setAdding(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickAdd.trim() }),
    })
    const data = await res.json()
    if (data.data) {
      setTasks((prev) => [data.data, ...prev])
      toast.success('Tarefa adicionada!')
    }
    setQuickAdd('')
    setAdding(false)
    quickAddRef.current?.focus()
  }

  async function updateTaskDetail(id: string, fields: Partial<Pick<Task, 'title' | 'description' | 'due_date'>>) {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...fields } : t))
  }

  const pending = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  function isOverdue(task: Task) {
    return task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
  }

  if (loading) {
    return (
      <div className="todo-skeleton">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-row" />)}
      </div>
    )
  }

  return (
    <div className="todo-root">
      {/* Lista principal */}
      <div className="todo-list-wrap">
        <h1 className="todo-title">Tarefas</h1>

        {/* Tarefas pendentes */}
        <div className="todo-group">
          {pending.length === 0 && (
            <p className="empty-state" style={{ padding: '1rem 0' }}>Nenhuma tarefa pendente 🎉</p>
          )}
          {pending.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selected?.id === task.id}
              overdue={!!isOverdue(task)}
              onToggle={() => toggleDone(task)}
              onSelect={() => setSelected(task)}
            />
          ))}
        </div>

        {/* Concluídas (colapsável) */}
        {done.length > 0 && (
          <div className="todo-done-section">
            <button
              className="todo-done-toggle"
              onClick={() => setDoneExpanded((v) => !v)}
            >
              {doneExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>Concluída</span>
              <span className="todo-done-count">{done.length}</span>
            </button>

            {doneExpanded && (
              <div className="todo-group">
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={selected?.id === task.id}
                    overdue={false}
                    onToggle={() => toggleDone(task)}
                    onSelect={() => setSelected(task)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="todo-quick-add">
          <Plus size={18} className="todo-quick-add-icon" />
          <input
            ref={quickAddRef}
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder="Adicionar uma tarefa"
            className="todo-quick-add-input"
            disabled={adding}
          />
        </form>
      </div>

      {/* Painel de detalhes */}
      {selected && (
        <DetailPanel
          task={selected}
          onClose={() => setSelected(null)}
          onToggle={() => toggleDone(selected)}
          onDelete={() => deleteTask(selected.id)}
          onUpdate={(fields) => updateTaskDetail(selected.id, fields)}
        />
      )}
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({
  task, selected, overdue, onToggle, onSelect,
}: {
  task: Task
  selected: boolean
  overdue: boolean
  onToggle: () => void
  onSelect: () => void
}) {
  const isDone = task.status === 'done'

  return (
    <div
      className={`todo-row${selected ? ' todo-row--selected' : ''}`}
      onClick={onSelect}
    >
      <button
        className={`todo-check${isDone ? ' todo-check--done' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        aria-label={isDone ? 'Reabrir' : 'Concluir'}
      >
        {isDone && (
          <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="todo-row-info">
        <span className={`todo-row-title${isDone ? ' todo-row-title--done' : ''}`}>
          {task.title}
        </span>
        {task.due_date && (
          <span className={`todo-row-due${overdue ? ' todo-row-due--overdue' : ''}`}>
            <Calendar size={11} />
            {format(parseISO(task.due_date), "dd 'de' MMM", { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  )
}

// ── DetailPanel ───────────────────────────────────────────────────────────────
function DetailPanel({
  task, onClose, onToggle, onDelete, onUpdate,
}: {
  task: Task
  onClose: () => void
  onToggle: () => void
  onDelete: () => void
  onUpdate: (fields: Partial<Pick<Task, 'title' | 'description' | 'due_date'>>) => void
}) {
  const isDone = task.status === 'done'
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '')

  // Reset quando muda a tarefa selecionada
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '')
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveTitle() {
    if (title.trim() && title.trim() !== task.title) {
      onUpdate({ title: title.trim() })
    }
  }

  function saveDescription() {
    if (description !== (task.description ?? '')) {
      onUpdate({ description: description || null })
    }
  }

  function saveDate(val: string) {
    setDueDate(val)
    onUpdate({ due_date: val ? `${val}T00:00:00` : null })
  }

  return (
    <div className="todo-detail">
      {/* Header */}
      <div className="todo-detail-header">
        <button
          className={`todo-check todo-check--lg${isDone ? ' todo-check--done' : ''}`}
          onClick={onToggle}
          aria-label={isDone ? 'Reabrir' : 'Concluir'}
        >
          {isDone && (
            <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <textarea
          className={`todo-detail-title${isDone ? ' todo-row-title--done' : ''}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          rows={2}
        />
        <button className="todo-detail-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      {/* Prazo */}
      <div className="todo-detail-field">
        <label className="todo-detail-label">
          <Calendar size={14} /> Prazo
        </label>
        <input
          type="date"
          className="filter-select"
          value={dueDate}
          onChange={(e) => saveDate(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Anotação */}
      <div className="todo-detail-field">
        <label className="todo-detail-label">Anotação</label>
        <textarea
          className="todo-detail-notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Adicionar anotação…"
          rows={5}
        />
      </div>

      {/* Criado em */}
      <p className="todo-detail-created">
        Criado em {format(parseISO(task.created_at), "d 'de' MMMM", { locale: ptBR })}
      </p>

      {/* Deletar */}
      <button className="todo-detail-delete" onClick={onDelete}>
        <Trash2 size={15} /> Excluir tarefa
      </button>
    </div>
  )
}
