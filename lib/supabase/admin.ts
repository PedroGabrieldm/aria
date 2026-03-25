import { createClient } from '@supabase/supabase-js'

// Client admin sem cookies — usado em Route Handlers chamados por serviços externos (webhook)
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
