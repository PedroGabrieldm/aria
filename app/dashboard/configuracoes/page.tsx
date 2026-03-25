import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ConfiguracoesClient } from '@/components/dashboard/ConfiguracoesClient'
import { Suspense } from 'react'

export default async function ConfiguracoesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, whatsapp_number, plan, google_calendar_token')
    .eq('id', user.id)
    .single()

  const profileData = {
    id: user.id,
    full_name: profile?.full_name ?? null,
    whatsapp_number: profile?.whatsapp_number ?? null,
    plan: profile?.plan ?? 'free',
    google_calendar_connected: !!profile?.google_calendar_token,
  }

  return (
    // Suspense necessário pois ConfiguracoesClient usa useSearchParams()
    <Suspense>
      <ConfiguracoesClient profile={profileData} email={user.email ?? ''} />
    </Suspense>
  )
}
