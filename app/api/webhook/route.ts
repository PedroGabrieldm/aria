import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { processMessage } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/evolution'
import { transcribeAudio } from '@/lib/whisper'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Filtra apenas eventos de mensagem recebida
    const event = body?.event
    if (event && !['messages.upsert', 'message'].includes(event)) {
      return NextResponse.json({ ok: true })
    }

    const remoteJid: string | undefined = body?.data?.key?.remoteJid
    const phone = remoteJid?.replace('@s.whatsapp.net', '')

    // Ignora mensagens de grupos
    if (!phone || remoteJid?.includes('@g.us')) {
      return NextResponse.json({ ok: true })
    }

    // Ignora mensagens enviadas pelo próprio bot
    if (body?.data?.key?.fromMe === true) {
      return NextResponse.json({ ok: true })
    }

    const textMessage: string | undefined =
      body?.data?.message?.conversation ??
      body?.data?.message?.extendedTextMessage?.text

    const audioMessage = body?.data?.message?.audioMessage
    const imageMessage = body?.data?.message?.imageMessage

    let text: string | null = null
    let mediaType: 'text' | 'audio' | 'image' = 'text'

    if (textMessage) {
      text = textMessage
      mediaType = 'text'
    } else if (audioMessage) {
      const audioUrl: string | undefined = audioMessage?.url
      if (audioUrl) {
        text = await transcribeAudio(audioUrl)
        mediaType = 'audio'
      }
    } else if (imageMessage) {
      const caption: string = imageMessage?.caption || 'Imagem recebida sem legenda.'
      text = `[IMAGEM] ${caption}`
      mediaType = 'image'
    }

    if (!text) return NextResponse.json({ ok: true })

    const supabase = createSupabaseAdminClient()

    // Busca perfil pelo número de WhatsApp
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan')
      .eq('whatsapp_number', phone)
      .single()

    if (!profile) {
      await sendWhatsAppMessage(
        phone,
        '👋 Número não cadastrado. Acesse o app e cadastre seu WhatsApp nas Configurações.'
      )
      return NextResponse.json({ ok: true })
    }

    // Busca histórico recente (últimas 10 mensagens)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const messages = (history ?? []).reverse()

    // Salva mensagem do usuário
    await supabase.from('messages').insert({
      user_id: profile.id,
      role: 'user',
      content: text,
      media_type: mediaType,
    })

    // Processa com Claude
    const response = await processMessage({
      userId: profile.id,
      userMessage: text,
      history: messages,
      mediaType,
    })

    // Salva resposta do assistente
    await supabase.from('messages').insert({
      user_id: profile.id,
      role: 'assistant',
      content: response,
      media_type: 'text',
    })

    // Envia pelo WhatsApp
    await sendWhatsAppMessage(phone, response)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook] Erro:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
