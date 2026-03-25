import OpenAI from 'openai'
import axios from 'axios'
import { writeFile, unlink } from 'fs/promises'
import { createReadStream } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function transcribeAudio(audioUrl: string): Promise<string> {
  // Baixa o arquivo de áudio da Evolution API
  const response = await axios.get(audioUrl, { responseType: 'arraybuffer' })

  // Salva temporariamente — Whisper precisa de arquivo físico
  const tmpPath = join(tmpdir(), `audio_${Date.now()}.ogg`)
  await writeFile(tmpPath, Buffer.from(response.data))

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpPath) as unknown as File,
      model: 'whisper-1',
      language: 'pt',
    })
    return transcription.text
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}
