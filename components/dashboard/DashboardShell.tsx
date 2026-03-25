'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface DashboardShellProps {
  children: React.ReactNode
  user: { name: string; email: string; plan: string }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-root">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />
      <div className="dashboard-main">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main className="dashboard-content">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
