import compromise from 'compromise';
import { tokenize } from './text';

export function extractKeywordsFromJD(jd: string) {
  const nlp = compromise(jd);
  const skills = new Set<string>();
  nlp.nouns()
    .out('array')
    .forEach((w: string) => {
      if (w.length > 2) skills.add(w.toLowerCase());
    });
  tokenize(jd).forEach((t) => {
    if (/^[a-z0-9.+#-]{3,}$/.test(t)) skills.add(t);
  });
  return Array.from(skills);
}

export function matchKeywords(resume: string, jd: string) {
  const jdKeys = extractKeywordsFromJD(jd);
  const resTokens = new Set(tokenize(resume));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeys) {
    if (resTokens.has(k)) matched.push(k);
    else missing.push(k);
  }
  return { matched, missing };
}