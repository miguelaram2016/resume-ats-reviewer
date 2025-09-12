import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function parseFromFile(file: File): Promise<{ text: string; fileName: string }> {
  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  const name = file.name || 'resume'

  try {
    if (name.toLowerCase().endsWith('.pdf')) {
      const out = await pdfParse(buf as any)
      return { text: String((out as any)?.text ?? ''), fileName: name }
    }
    if (name.toLowerCase().endsWith('.docx')) {
      const out = await mammoth.extractRawText({ buffer: buf })
      return { text: String((out as any)?.value ?? ''), fileName: name }
    }
  } catch (e: any) {
    console.error(`[parseFromFile] failed (${name}):`, e?.stack || e)
  }
  return { text: buf.toString('utf8'), fileName: name }
}
