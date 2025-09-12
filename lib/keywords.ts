// lib/keywords.ts
import { tokenize } from "./text";

export function extractKeywordsFromJD(jd: string) {
  const skills = new Set<string>();
  // tech-ish tokens and nouns-ish by shape
  for (const t of tokenize(jd)) {
    if (/^[a-z0-9.+#-]{3,}$/i.test(t)) skills.add(t);
  }
  return Array.from(skills);
}

export function matchKeywords(resume: string, jd: string) {
  const jdKeys = extractKeywordsFromJD(jd);
  const resTokens = new Set(tokenize(resume));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeys) {
    (resTokens.has(k) ? matched : missing).push(k);
  }
  return { matched, missing };
}
