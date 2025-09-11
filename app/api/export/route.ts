import { NextRequest, NextResponse } from 'next/server'
import { toMarkdown, toPdf } from '@/lib/export'

export const runtime = 'nodejs'

export async function POST(req: NextRequest){
  const kind = (new URL(req.url)).searchParams.get('kind') || 'md'
  const payload = await req.json()

  if (kind === 'pdf'){
    const bytes = await toPdf(payload)
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="resume-review.pdf"',
      }
    })
  }

  const md = toMarkdown(payload)
  return new NextResponse(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="resume-review.md"',
    }
  })
}
