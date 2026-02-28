// lib/parseResume.ts
// Simple resume parsing using pdf-parse

import type { DocHints } from './types';
import type { Readable } from 'stream';

export interface ParseResult {
  text: string;
  hints?: DocHints;
}

// Dynamic import for pdf-parse
let pdfParse: any = null;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('[parseResume] pdf-parse not available');
}

/**
 * Parse a resume file (PDF, DOCX, etc.) to clean text
 */
export async function parseResume(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const name = file.name || 'resume';
  const buf = Buffer.from(arrayBuffer);

  // Try PDF
  if (name.toLowerCase().endsWith('.pdf') && pdfParse) {
    try {
      const out: any = await pdfParse(buf);
      const text = cleanText(String(out?.text || ''));
      if (text.length > 50) {
        return { text, hints: extractHints(text, 'pdf-parse') };
      }
    } catch (e) {
      console.warn('[parseResume] pdf-parse failed:', e);
    }
  }

  // Fallback: plain text
  const text = cleanText(buf.toString('utf8').substring(0, 10000));
  return { text, hints: extractHints(text, 'fallback') };
}

/**
 * Parse from file path (server-side)
 */
export async function parseResumeFromPath(filePath: string): Promise<ParseResult> {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const buf = fs.readFileSync(filePath);
    const name = path.basename(filePath);
    
    if (name.toLowerCase().endsWith('.pdf') && pdfParse) {
      const out: any = await pdfParse(buf);
      const text = cleanText(String(out?.text || ''));
      if (text.length > 50) {
        return { text, hints: extractHints(text, 'pdf-parse') };
      }
    }
  } catch (e) {
    console.warn('[parseResumeFromPath] failed:', e);
  }
  
  return { text: '', hints: { emails: [], phones: [], links: [], headings: [], bullets: [], charCount: 0, method: 'none' } };
}

/**
 * Clean extracted text - remove extra whitespace and garbage
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\x20-\x7E\n]/g, '')  // Keep only printable ASCII
    .trim();
}

/**
 * Extract basic hints from text for scoring
 */
function extractHints(text: string, method: string): DocHints {
  const emails = text.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];
  const phones = text.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi) || [];
  const links = text.match(/https?:\/\/\S+/gi) || [];
  
  // Extract headings (lines that look like section titles)
  const lines = text.split(/\n/);
  const headings = lines
    .filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.length > 3 &&
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
