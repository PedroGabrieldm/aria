'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  CheckSquare,
  Smartphone,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/tarefas', label: 'Tarefas', icon: CheckSquare },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  user: { name: string; email: string; plan: string }
}

export function Sidebar({ open, onClose, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  function handleNav(href: string) {
    onClose()
    router.prefetch(href)
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">✦</span>
          <span className="sidebar-logo-text">Aria</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {/* Navegação principal */}
        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Menu</p>
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onClick={() => handleNav(href)}
              className={`sidebar-link${isActive(href, exact) ? ' sidebar-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}

          <p className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>Config</p>

          <Link
            href="/dashboard/configuracoes"
            prefetch={true}
            onClick={() => handleNav('/dashboard/configuracoes')}
            className={`sidebar-link${isActive('/dashboard/configuracoes') ? ' sidebar-link--active' : ''}`}
          >
            <Smartphone size={18} />
            <span>WhatsApp</span>
            <span className="sidebar-badge">●</span>
          </Link>

          <Link
            href="/dashboard/configuracoes"
            prefetch={true}
            onClick={() => handleNav('/dashboard/configuracoes')}
            className={`sidebar-link${isActive('/dashboard/configuracoes') ? ' sidebar-link--active' : ''}`}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </Link>

          <form action={logout}>
            <button type="submit" className="sidebar-link sidebar-link--logout">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </form>
        </nav>

        {/* Rodapé com usuário */}
        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user.name || user.email}</p>
            <p className="sidebar-user-plan">Plano {user.plan}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
