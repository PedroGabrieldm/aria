import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Garante que o perfil existe — cria automaticamente se não existir
  // (pode acontecer quando o Supabase exige confirmação de email antes do insert)
  await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan')
    .eq('id', user.id)
    .single()

  const userData = {
    name: profile?.full_name ?? '',
    email: user.email ?? '',
    plan: profile?.plan ?? 'free',
  }

  return <DashboardShell user={userData}>{children}</DashboardShell>
}
