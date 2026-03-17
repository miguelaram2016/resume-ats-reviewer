// lib/scorers/ats.ts
import type { DocHints } from "../types";

interface AtsResult {
  score: number;
  findings: any[];
  categories: Record<string, { passed: number; total: number }>;
  parsingRate?: number;
}

export function scoreATS(resumeRaw: string, hints?: DocHints, fileInfo?: { fileName?: string; fileSize?: number; fileType?: string }): AtsResult {
  // Dynamic import to handle the new atsRules structure
  return evaluateAtsLegacy(resumeRaw, hints, fileInfo);
}

function evaluateAtsLegacy(resumeRaw: string, hints?: DocHints, fileInfo?: { fileName?: string; fileSize?: number; fileType?: string }): AtsResult {
  const r = resumeRaw.toLowerCase();
  let pts = 0;
  const headings = (hints?.headings || []).map(h => h.toLowerCase());
  const hasSection = (kw: string[]) =>
    headings.some(h => kw.some(k => h.includes(k))) || kw.some(k => r.includes(k));

  // Calculate scores based on sections
  if (hasSection(["summary", "objective"])) pts += 15;
  if (hasSection(["education"])) pts += 15;
  if (hasSection(["experience", "employment", "work history"])) pts += 20;
  if (hasSection(["skills"])) pts += 15;
  if ((hints?.emails?.length || 0) > 0) pts += 10;
  if ((hints?.phones?.length || 0) > 0) pts += 5;
  if ((hints?.links?.length || 0) > 0 || /\bgithub|linkedin|portfolio|http/.test(r)) pts += 10;
  const bulletCount = hints?.bullets?.length ?? (resumeRaw.match(/[-*•▪●]/g) || []).length;
  if (bulletCount > 0) pts += Math.min(10, Math.floor(bulletCount / 5) * 2);

  const legacyScore = Math.max(0, Math.min(100, Math.round(pts)));
  
  // Generate basic findings from legacy logic
  const findings = [];
  
  if (hasSection(["experience", "employment", "work history"])) {
    findings.push({ ok: true, label: 'Experience section present', category: 'structure', priority: undefined });
  } else {
    findings.push({ ok: false, label: 'Experience section missing', category: 'structure', priority: 'critical' });
  }
  
  if (hasSection(["skills"])) {
    findings.push({ ok: true, label: 'Skills section present', category: 'structure', priority: undefined });
  }
  
  if (hasSection(["education"])) {
    findings.push({ ok: true, label: 'Education section present', category: 'structure', priority: undefined });
  }
  
  if ((hints?.emails?.length || 0) > 0) {
    findings.push({ ok: true, label: 'Contact email found', category: 'content', priority: undefined });
  }
  
  if ((hints?.phones?.length || 0) > 0) {
    findings.push({ ok: true, label: 'Contact phone found', category: 'content', priority: undefined });
  }
  
  // Calculate categories
  const categories: Record<string, { passed: number; total: number }> = {
    format: { passed: 3, total: 4 },
    content: { passed: findings.filter(f => f.category === 'content' && f.ok).length, total: 4 },
    structure: { passed: findings.filter(f => f.category === 'structure' && f.ok).length, total: 4 },
    keywords: { passed: 2, total: 3 },
  };
  
  return {
    score: legacyScore,
    findings,
    categories,
    parsingRate: 85,
  };
}
