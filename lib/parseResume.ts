// lib/parseResume.ts
// Resume parsing - uses Python pdfplumber for better extraction

import { spawn } from 'child_process';
import type { DocHints } from './types';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';

const exec = promisify((exe: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
  const child = spawn(exe, args, { shell: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => stdout += d);
  child.stderr.on('data', d => stderr += d);
  child.on('close', () => cb(null, stdout, stderr));
});

export interface ParseResult {
  text: string;
  hints?: DocHints;
}

const PYTHON_SCRIPT = 'C:/Users/migue/.openclaw/workspace/resume-ats-reviewer/scripts/extract_pdf.py';

/**
 * Parse a resume file using Python pdfplumber
 */
export async function parseResume(file: File): Promise<ParseResult> {
  const name = file.name || 'resume';
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  // Only try Python for PDFs
  if (name.toLowerCase().endsWith('.pdf')) {
    try {
      // Write temp file
      const tempPath = `C:/Users/migue/.openclaw/workspace/resume-ats-reviewer/temp_${Date.now()}.pdf`;
      await writeFile(tempPath, buf);
      
      // Run Python extraction
      const python = process.platform === 'win32' ? 'python' : 'python3';
      const result = await exec(python, [PYTHON_SCRIPT, tempPath]);
      
      // Clean up
      try { await unlink(tempPath); } catch {}
      
      // Parse result - handle base64 encoding
      const parsed = JSON.parse(result[0]);
      if (parsed.text) {
        const text = Buffer.from(parsed.text, 'base64').toString('utf-8');
        if (text.length > 50) {
          return { text, hints: extractHints(text, 'python-pdfplumber') };
        }
      }
    } catch (e) {
      console.warn('[parseResume] Python extraction failed:', e);
    }
  }

  // Fallback: return raw text
  const text = buf.toString('utf8').substring(0, 10000);
  return { text, hints: extractHints(text, 'fallback') };
}

/**
 * Extract basic hints from text
 */
function extractHints(text: string, method: string): DocHints {
  const emails = text.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];
  const phones = text.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi) || [];
  const links = text.match(/https?:\/\/\S+/gi) || [];
  
  const lines = text.split(/\n/);
  const headings = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 3 && trimmed.length < 50 && /^[A-Z][A-Za-z\s]+$/.test(trimmed) && !/^\d+$/.test(trimmed);
  }).slice(0, 20);
  
  const bullets = lines.filter(line => /^[-*•▪●]/.test(line.trim()));

  return { emails, phones, links, headings, bullets, charCount: text.length, method };
}
