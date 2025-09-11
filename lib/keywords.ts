// lib/keywords.ts
import compromise from "compromise";
import { tokenize } from "./text";

/** Extract a rough set of keywords from a JD (nouns + tech-y tokens). */
export function extractKeywordsFromJD(jd: string): string[] {
  const nlp = compromise(jd || "");
  const skills = new Set<string>();

  // nouns and proper nouns
  nlp.nouns().out("array").forEach((w: string) => {
    const t = (w || "").toLowerCase().trim();
    if (t.length >= 3) skills.add(t);
  });

  // token filter for tech-ish tokens (allow ., +, #, - common in stack names)
  tokenize(jd).forEach((t) => {
    if (/^[a-z0-9.+#-]{3,}$/.test(t)) skills.add(t);
  });

  return Array.from(skills);
}

/** Return matched and missing keywords comparing resume vs JD. */
export function matchKeywords(resume: string, jd: string) {
  const jdKeys = extractKeywordsFromJD(jd);
  const resTokens = new Set(tokenize(resume));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeys) (resTokens.has(k) ? matched : missing).push(k);
  return { matched, missing };
}
