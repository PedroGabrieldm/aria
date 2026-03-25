'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPathname = useRef(pathname)

  // Detecta mudança de rota
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Rota mudou — completa a barra e some
      setProgress(100)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      prevPathname.current = pathname
    }
  }, [pathname])

  // Inicia a barra quando o link é clicado (via evento global)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || !href.startsWith('/') || href === pathname) return

      // Limpa timers anteriores
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)

      setProgress(10)
      setVisible(true)

      // Avança progressivamente até 85% (sem chegar a 100 — espera a rota mudar)
      let current = 10
      intervalRef.current = setInterval(() => {
        current += Math.random() * 15
        if (current >= 85) {
          current = 85
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
        setProgress(current)
      }, 200)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 3,
        width: `${progress}%`,
        background: 'var(--accent)',
        zIndex: 9999,
        transition: progress === 100 ? 'width 0.1s ease, opacity 0.3s ease' : 'width 0.2s ease',
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 8px var(--accent)',
        borderRadius: '0 2px 2px 0',
        pointerEvents: 'none',
      }}
    />
  )
}
