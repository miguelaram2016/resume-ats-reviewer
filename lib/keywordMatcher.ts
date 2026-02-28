// lib/keywordMatcher.ts
import { extractKeyPhrases, toSet, tokenize, isNear, normalize } from "./normalizer";
import type { MatchResult } from "./types";

export function matchKeywords(resumeText: string, jdText: string): MatchResult {
  const resumeN = normalize(resumeText);
  const jdN = normalize(jdText);

  const resumeTokens = tokenize(resumeN);
  const jdTokens = tokenize(jdN);

  const resumeSet = toSet(resumeTokens);
  const jdSet = toSet(jdTokens);

  const jdKeyPhrases = extractKeyPhrases(jdTokens);
  const resKeyPhrases = extractKeyPhrases(resumeTokens);

  const matched: string[] = [];
  const missing: string[] = [];
  const resPhraseSet = new Set(resKeyPhrases);

  for (const phrase of jdKeyPhrases) {
    const base = phrase.replace(/(ing|ed|es|s)$/, "");
    const found =
      resPhraseSet.has(phrase) ||
      [...resPhraseSet].some(q => isNear(q, phrase)) ||
      resumeSet.has(base);

    if (found) matched.push(phrase);
    else missing.push(phrase);
  }

  for (const tok of jdSet) {
    if (resumeSet.has(tok)) matched.push(tok);
    else missing.push(tok);
  }

  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 200);
  return { matched: uniq(matched), missing: uniq(missing.filter(m => !matched.includes(m))) };
}

export function calculateKeywordScore(matched: string[], missing: string[]): number {
  const total = matched.length + missing.length;
  if (total === 0) return 0;
  return Math.round((matched.length / Math.max(1, total)) * 100);
}
