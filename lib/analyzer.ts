// lib/analyzer.ts
import { matchKeywords, calculateKeywordScore } from "./keywordMatcher";
import { scoreATS, scoreImpact, scoreClarity } from "./scorers";
import { buildFlags } from "./flags";
import { suggestRewrites } from "./rewriter";
import { buildSummary } from "./summary";
import type { AnalyzeInput, AnalyzeOutput, Weights } from "./types";

const DEFAULT_WEIGHTS: Weights = { ats: 0.3, keyword_match: 0.35, impact: 0.2, clarity: 0.15 };

function redact(s: string): string {
  return s.replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\bhttps?:\/\/\S+\b/gi, "[REDACTED_URL]");
}

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { redactPII = false } = input;
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
  const { matched, missing } = matchKeywords(input.resumeText, input.jd);
  const keywordScore = calculateKeywordScore(matched, missing);
  const atsScore = scoreATS(input.resumeText, input.hints?.resume);
  const impactScore = scoreImpact(input.resumeText, input.hints?.resume);
  const clarityScore = scoreClarity(input.resumeText);
  const overall = weightedScore([
    [atsScore, weights.ats ?? DEFAULT_WEIGHTS.ats!],
    [keywordScore, weights.keyword_match ?? DEFAULT_WEIGHTS.keyword_match!],
    [impactScore, weights.impact ?? DEFAULT_WEIGHTS.impact!],
    [clarityScore, weights.clarity ?? DEFAULT_WEIGHTS.clarity!],
  ]);
  const flags = buildFlags(input.resumeText, input.hints?.resume);
  const suggestedRewrites = suggestRewrites(input.resumeText);
  const tailoredSummary = buildSummary(input.resumeText, input.jd, keywordScore, matched.length);
  const post = (s: string) => (redactPII ? redact(s) : s);
  const CAP = 10;
  return {
    scores: { overall, ats: atsScore, keyword_match: keywordScore, impact: impactScore, clarity: clarityScore },
    matched_keywords: matched.slice(0, CAP).map(post),
    missing_keywords: missing.slice(0, CAP).map(post),
    flags: flags.map(post),
    fix_list: flags.map(f => `Fix: ${f}`).map(post),
    suggested_rewrites: suggestedRewrites.map(post),
    tailored_summary: post(tailoredSummary),
    matched_total: matched.length,
    missing_total: missing.length,
  };
}

function weightedScore(pairs: Array<[number, number]>): number {
  const sumW = pairs.reduce((a, [, w]) => a + w, 0) || 1;
  const v = pairs.reduce((a, [s, w]) => a + (s * w), 0) / sumW;
  return Math.max(0, Math.min(100, Math.round(v)));
}
