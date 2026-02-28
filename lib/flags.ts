// lib/flags.ts
import type { DocHints } from "./types";

export function buildFlags(raw: string, hints?: DocHints): string[] {
  const flags: string[] = [];
  const r = raw.toLowerCase();
  const headings = (hints?.headings || []).map(h => h.toLowerCase());
  const hasSection = (kw: string[]) => headings.some(h => kw.some(k => h.includes(k))) || kw.some(k => r.includes(k));

  if (!hasSection(["summary", "objective"])) flags.push("Add a brief Professional Summary (2–3 lines).");
  if (!hasSection(["education"])) flags.push("Add an Education section.");
  if (!hasSection(["experience", "employment", "work history"])) flags.push("Add an Experience section.");
  if (!hasSection(["skills"])) flags.push("Add a Skills section.");
  const bulletCount = hints?.bullets?.length ?? (raw.match(/[-*•▪●]/g) || []).length;
  if (bulletCount < 6) flags.push("Use bullet points for readability and scannability.");
  if ((hints?.emails?.length || 0) === 0 && (hints?.phones?.length || 0) === 0) flags.push("Ensure contact info (email/phone) is present and selectable.");
  return flags.slice(0, 10);
}
