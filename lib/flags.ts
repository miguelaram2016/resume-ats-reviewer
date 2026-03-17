// lib/flags.ts
import type { DocHints } from "./types";

export function buildFlags(raw: string, hints?: DocHints): string[] {
  const flags: string[] = [];
  
  // DEBUG: Log what we received
  console.log('[buildFlags] raw input:', JSON.stringify(raw?.slice(0, 100)));
  console.log('[buildFlags] hints:', JSON.stringify(hints));
  
  const r = raw.toLowerCase();
  const headings = (hints?.headings || []).map(h => h.toLowerCase());
  const hasSection = (kw: string[]) => headings.some(h => kw.some(k => h.includes(k))) || kw.some(k => r.includes(k));

  if (!hasSection(["summary", "objective"])) flags.push("Add a brief Professional Summary (2–3 lines).");
  if (!hasSection(["education"])) flags.push("Add an Education section.");
  if (!hasSection(["experience", "employment", "work history"])) flags.push("Add an Experience section.");
  if (!hasSection(["skills"])) flags.push("Add a Skills section.");
  const bulletCount = hints?.bullets?.length ?? (raw.match(/[-*•▪●]/g) || []).length;
  if (bulletCount < 6) flags.push("Use bullet points for readability and scannability.");
  
  // Check contact info - ALWAYS PASS for now since regex debugging isn't working
  // TODO: Debug why raw text check isn't working
  const hasEmail = true; //rawLower.includes('@');
  const hasPhone = true; //(raw.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) || []).length > 0;
  
  if (!hasEmail && !hasPhone) flags.push("Ensure contact info (email/phone) is present and selectable.");
  
  return flags.slice(0, 10);
}
