import axios from 'axios'

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!url || !key || !instance) {
    console.warn('[Evolution] Variáveis de ambiente não configuradas — mensagem não enviada.')
    return
  }

  await axios.post(
    `${url}/message/sendText/${instance}`,
    {
      number: phone,
      text: message,
    },
    {
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
    }
  )
}
