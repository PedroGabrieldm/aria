import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { exchangeCodeForToken } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const userId = searchParams.get('state') // passamos userId como state no getAuthUrl
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/configuracoes?calendar=error`)
  }

  try {
    const token = await exchangeCodeForToken(code)

    const supabase = await createSupabaseServerClient()
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ google_calendar_token: token })
      .eq('id', userId)

    if (dbError) {
      return NextResponse.redirect(`${appUrl}/dashboard/configuracoes?calendar=error`)
    }

    return NextResponse.redirect(`${appUrl}/dashboard/configuracoes?calendar=success`)
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/configuracoes?calendar=error`)
  }
}
