import { NextRequest, NextResponse } from 'next/server'
import { analyze } from '@/lib/analyze'
import { parseFromFile } from '@/lib/parseResume'

export const runtime = 'nodejs'

export async function POST(req: NextRequest){
  const form = await req.formData()
  const jd = (form.get('jd') as string) || ''
  let resumeText = (form.get('resume_text') as string) || ''
  const file = form.get('resume') as unknown as File | null

  if (file) {
    const parsed = await parseFromFile(file)
    resumeText = parsed.text || resumeText
  }
  if (!jd || !resumeText){
    return NextResponse.json({ error: 'Provide both resume and JD (text or file).'}, { status: 400 })
  }

  let weights = undefined as any
  try { weights = JSON.parse(String(form.get('weights')||'')) } catch {}
  const pii = String(form.get('pii')||'true') === 'true'

  const out = analyze({ resumeText, jd, weights, pii })
  return NextResponse.json(out)
}
