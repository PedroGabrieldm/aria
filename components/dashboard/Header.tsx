'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/agenda': 'Agenda',
  '/dashboard/tarefas': 'Tarefas',
  '/dashboard/configuracoes': 'Configurações',
}

interface HeaderProps {
  onMenuOpen: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'

  return (
    <header className="dashboard-header">
      <button
        className="header-menu-btn"
        onClick={onMenuOpen}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="header-title">{title}</h1>

      <div className="header-actions">
        <ThemeToggle />
      </div>
    </header>
  )
}
