import type { Metadata } from 'next'
import { Geist, Geist_Mono, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/dashboard/ThemeProvider'
import { NavigationProgress } from '@/components/dashboard/NavigationProgress'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Aria',
  description: 'Seu assistente pessoal inteligente via WhatsApp',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${geistMono.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NavigationProgress />
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{ duration: 3000 }}
          richColors
        />
      </body>
    </html>
  )
}
