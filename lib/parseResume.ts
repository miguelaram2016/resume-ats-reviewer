// lib/parseResume.ts
// Resume parsing using markitdown for clean markdown extraction

import { MarkItDown } from 'markitdown';
import type { DocHints } from './types';

export interface ParseResult {
  text: string;
  hints?: DocHints;
}

/**
 * Parse a resume file (PDF, DOCX, etc.) to clean text using markitdown
 */
export async function parseResume(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const name = file.name || 'resume';

  try {
    const md = new MarkItDown();
    const result = md.convert(Buffer.from(arrayBuffer), name);
    const text = result?.text_content || '';
    return {
      text,
      hints: extractHints(text, 'markitdown'),
    };
  } catch (e) {
    console.error(`[parseResume] failed (${name}):`, e);
  }

  // Fallback
  return { text: '', hints: { emails: [], phones: [], links: [], headings: [], bullets: [], charCount: 0, method: 'none' } };
}

/**
 * Parse from file path (for server-side use)
 */
export async function parseResumeFromPath(filePath: string): Promise<ParseResult> {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const md = new MarkItDown();
    const result = md.convert(fs.readFileSync(filePath), path.basename(filePath));
    const text = result?.text_content || '';
    return {
      text,
      hints: extractHints(text, 'markitdown'),
    };
  } catch (e) {
    console.error(`[parseResumeFromPath] failed (${filePath}):`, e);
  }

  return { text: '', hints: { emails: [], phones: [], links: [], headings: [], bullets: [], charCount: 0, method: 'none' } };
}

/**
 * Extract basic hints from text for scoring
 */
function extractHints(text: string, method: string): DocHints {
  // Extract emails
  const emails = text.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];

  // Extract phones
  const phones = text.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi) || [];

  // Extract URLs
  const links = text.match(/https?:\/\/\S+/gi) || [];

  // Extract headings (lines that look like section titles)
  const lines = text.split(/\n/);
  const headings = lines
    .filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        trimmed.length < 50 &&
        /^[A-Z][A-Za-z\s]+$/.test(trimmed) &&
        !/^\d+$/.test(trimmed)
      );
    })
    .slice(0, 20);

  // Count bullet points
  const bullets = lines.filter(line => /^[-*•▪●]/.test(line.trim()));

  return {
    emails,
    phones,
    links,
    headings,
    bullets,
    charCount: text.length,
    method,
  };
}
