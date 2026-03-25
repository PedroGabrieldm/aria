import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!url || !key || !instance) {
    return NextResponse.json({ status: 'unconfigured' })
  }

  try {
    const { data } = await axios.get(
      `${url}/instance/connectionState/${instance}`,
      { headers: { apikey: key } }
    )

    const state = data?.instance?.state ?? data?.state ?? ''
    const isConnected = state === 'open'

    if (isConnected) {
      return NextResponse.json({ status: 'connected' })
    }

    // Tenta buscar QR code para reconexão
    try {
      const { data: qrData } = await axios.get(
        `${url}/instance/connect/${instance}`,
        { headers: { apikey: key } }
      )
      return NextResponse.json({
        status: 'disconnected',
        qrCode: qrData?.qrcode?.base64
          ? `data:image/png;base64,${qrData.qrcode.base64}`
          : null,
      })
    } catch {
      return NextResponse.json({ status: 'disconnected', qrCode: null })
    }
  } catch {
    return NextResponse.json({ status: 'disconnected', qrCode: null })
  }
}
