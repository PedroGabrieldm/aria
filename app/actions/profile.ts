'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const fullName = (formData.get('full_name') as string)?.trim()
  const whatsappNumber = (formData.get('whatsapp_number') as string)?.trim().replace(/\D/g, '')

  if (!fullName) return { error: 'Nome não pode ser vazio.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, whatsapp_number: whatsappNumber || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
