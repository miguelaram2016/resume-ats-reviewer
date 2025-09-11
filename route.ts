import { NextRequest, NextResponse } from 'next/server';
import { extractMainContent } from '@/lib/readability';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
  const res = await fetch(url);
  const html = await res.text();
  const art = await extractMainContent(html, url);
  return NextResponse.json({ title: art.title, text: art.text });
}