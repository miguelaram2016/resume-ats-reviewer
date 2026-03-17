// lib/parseResume.ts
// Resume parsing - serverless-compatible 
// Focus on mammoth (DOCX) and fallback to user-pasted text

import type { DocHints } from './types';

export interface ParseResult {
  text: string;
  hints?: DocHints;
  fileInfo?: {
    fileName: string;
    fileSize: number;
    fileType: string;
  };
  parsingFailed?: boolean;
}

/**
 * Check if extracted text looks like a valid resume
 */
function looksLikeResume(text: string): { valid: boolean; reason: string } {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lowerText = cleanText.toLowerCase();
  
  // Check for LaTeX/pdfTeX metadata markers
  if (cleanText.includes('PTEXFullbanner') || 
      cleanText.includes('TeX Live') ||
      cleanText.includes('pdfTeX') ||
      cleanText.includes('AuthorTitleSubjectCreator') ||
      lowerText.includes('kpathsea')) {
    return { valid: false, reason: 'LaTeX metadata detected' };
  }
  
  // Check for very short text (likely failed)
  if (cleanText.length < 200) {
    return { valid: false, reason: 'Text too short' };
  }
  
  // Check for high ratio of special characters (binary)
  const specialChars = (cleanText.match(/[^\x20-\x7E\s]/g) || []).length;
  const ratio = specialChars / cleanText.length;
  if (ratio > 0.05) {
    return { valid: false, reason: 'Too many special characters' };
  }
  
  // Check for common resume words (positive signal)
  const resumeIndicators = [
    'experience', 'education', 'skills', 'summary', 'professional',
    'developer', 'engineer', 'manager', 'project', 'work', 'company',
    'employment', 'background', 'qualifications'
  ];
  
  const foundIndicators = resumeIndicators.filter(word => lowerText.includes(word));
  
  // If we find at least 2 resume indicators, consider it valid
  if (foundIndicators.length >= 2) {
    return { valid: true, reason: 'Contains resume indicators' };
  }
  
  // If no resume indicators found but text is reasonable, might still be valid
  if (cleanText.length > 500) {
    return { valid: true, reason: 'Reasonable text length' };
  }
  
  return { valid: false, reason: 'No resume indicators found' };
}

/**
 * Parse a resume file - works on both local and Vercel
 */
export async function parseResume(file: File): Promise<ParseResult> {
  const name = file.name || 'resume';
  const arrayBuffer = await file.arrayBuffer();
  
  const fileInfo = {
    fileName: name,
    fileSize: arrayBuffer.byteLength,
    fileType: name.split('.').pop() || 'unknown'
  };

  // Handle DOCX with mammoth (most reliable)
  if (name.toLowerCase().endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const cleanText = result.value?.replace(/\s+/g, ' ').trim() || '';
      
      const validation = looksLikeResume(cleanText);
      console.log('[parseResume] DOCX result:', validation.reason, 'length:', cleanText.length);
      
      if (cleanText.length > 100 && validation.valid) {
        return { 
          text: result.value || '',
          hints: extractHints(cleanText, 'mammoth'), 
          fileInfo 
        };
      }
    } catch (e) {
      console.warn('[parseResume] DOCX mammoth failed:', e);
    }
  }

  // Handle PDF - try pdfjs-dist first, then mammoth as fallback
  if (name.toLowerCase().endsWith('.pdf')) {
    // Try pdfjs-dist first (better for most PDFs)
    try {
      console.log('[parseResume] Attempting PDF parsing with pdfjs-dist v3...');
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
      console.log('[parseResume] pdfjs imported, setting worker...');
      // Set up worker from local file for serverless compatibility
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('[parseResume] Worker set, loading document...');
      
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      console.log('[parseResume] Loading task created, awaiting promise...');
      const pdf = await loadingTask.promise;
      console.log('[parseResume] PDF loaded, numPages:', pdf.numPages);
      
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      const cleanText = fullText.replace(/\s+/g, ' ').trim();
      const validation = looksLikeResume(cleanText);
      console.log('[parseResume] PDF pdfjs-dist result:', validation.reason, 'length:', cleanText.length);
      
      if (cleanText.length > 100 && validation.valid) {
        return { 
          text: cleanText,
          hints: extractHints(cleanText, 'pdfjs'), 
          fileInfo 
        };
      }
    } catch (e) {
      console.error('[parseResume] PDF pdfjs-dist FAILED with error:', String(e), e instanceof Error ? e.stack : '');
    }
    
    // Fallback to mammoth if pdfjs fails
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const cleanText = result.value?.replace(/\s+/g, ' ').trim() || '';
      
      const validation = looksLikeResume(cleanText);
      console.log('[parseResume] PDF mammoth fallback result:', validation.reason, 'length:', cleanText.length);
      
      if (cleanText.length > 100 && validation.valid) {
        return { 
          text: result.value || '',
          hints: extractHints(cleanText, 'mammoth'), 
          fileInfo 
        };
      }
    } catch (e) {
      console.warn('[parseResume] PDF mammoth fallback failed:', e);
    }
  }

  // All parsers failed - mark as failed so UI can prompt user to paste text
  console.warn('[parseResume] All parsers failed, returning empty with parsingFailed flag');
  return { 
    text: '', 
    hints: extractHints('', 'failed'),
    fileInfo,
    parsingFailed: true
  };
}

/**
 * Extract basic hints from text
 */
export function extractHints(text: string, method: string = 'text'): DocHints {
  const emails = text.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];
  // More robust phone regex - matches (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
  const phones = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  const links = text.match(/https?:\/\/\S+/gi) || [];
  
  const lines = text.split(/\n/);
  const headings = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 3 && trimmed.length < 50 && /^[A-Z][A-Za-z\s]+$/.test(trimmed) && !/^\d+$/.test(trimmed);
  }).slice(0, 20);
  
  const bullets = lines.filter(line => /^[-*•▪●]/.test(line.trim()));

  return { emails, phones, links, headings, bullets, charCount: text.length, method };
}
