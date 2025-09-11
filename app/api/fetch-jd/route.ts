import { NextRequest, NextResponse } from 'next/server'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export const runtime = 'nodejs'

export async function POST(req: NextRequest){
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  const res = await fetch(url, { headers: { 'user-agent':'Mozilla/5.0' }})
  const html = await res.text()

  try {
    const dom = new JSDOM(html, { url })
    // drop nav/footers/aside/scripts/styles first
    dom.window.document.querySelectorAll('script,style,nav,footer,aside,form,noscript').forEach(n=>n.remove())
    const reader = new Readability(dom.window.document)
    const art = reader.parse()
    if (art?.textContent?.trim()) {
      return NextResponse.json({ text: art.textContent.trim() })
    }
  } catch (e) {
    // fall through
  }

  const fallback = html
    .replace(/<script[\s\S]*?<\/script>/g,' ')
    .replace(/<style[\s\S]*?<\/style>/g,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim()

  return NextResponse.json({ text: fallback })
}
