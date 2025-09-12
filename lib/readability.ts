import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function extractMainContent(html: string, baseURL?: string) {
  const dom = new JSDOM(html, { url: baseURL || 'https://example.org' });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = (article?.textContent || '').replace(/\s+/g, ' ').trim();
  return { title: article?.title || '', text };
}