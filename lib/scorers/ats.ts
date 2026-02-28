// lib/scorers/ats.ts
import type { DocHints } from "../types";

export function scoreATS(resumeRaw: string, hints?: DocHints): number {
  const r = resumeRaw.toLowerCase();
  let pts = 0;
  const headings = (hints?.headings || []).map(h => h.toLowerCase());
  const hasSection = (kw: string[]) =>
    headings.some(h => kw.some(k => h.includes(k))) || kw.some(k => r.includes(k));

  if (hasSection(["summary", "objective"])) pts += 15;
  if (hasSection(["education"])) pts += 15;
  if (hasSection(["experience", "employment", "work history"])) pts += 20;
  if (hasSection(["skills"])) pts += 15;
  if ((hints?.emails?.length || 0) > 0) pts += 10;
  if ((hints?.phones?.length || 0) > 0) pts += 5;
  if ((hints?.links?.length || 0) > 0 || /\bgithub|linkedin|portfolio|http/.test(r)) pts += 10;
  const bulletCount = hints?.bullets?.length ?? (resumeRaw.match(/[-*•▪●]/g) || []).length;
  if (bulletCount > 0) pts += Math.min(10, Math.floor(bulletCount / 5) * 2);

  return Math.max(0, Math.min(100, Math.round(pts)));
}
