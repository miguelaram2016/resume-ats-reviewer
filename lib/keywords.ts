// lib/keywords.ts
import { tokenize } from "./text";

export function extractKeywordsFromJD(jd: string): string[] {
  // naive: keep 3+ char tokens incl. techy ones with symbols
  const out = new Set<string>();
  for (const t of tokenize(jd)) {
    if (/^[a-z0-9.+#-]{3,}$/i.test(t)) out.add(t.toLowerCase());
  }
  return Array.from(out);
}

export function matchKeywords(resume: string, jd: string) {
  const jdKeys = extractKeywordsFromJD(jd);
  const resTokens = new Set(tokenize(resume));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeys) (resTokens.has(k) ? matched : missing).push(k);
  return { matched, missing };
}
