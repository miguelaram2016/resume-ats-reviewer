// lib/analyze.ts

// =========== Public types ===========
export type AnalyzeInput = {
  resumeText: string;
  jd: string;
  weights?: {
    ats?: number;            // formatting/compliance proxy
    keyword_match?: number;  // JD/resume overlap
    impact?: number;         // quantified results/action
    clarity?: number;        // readability/structure
  };
  redactPII?: boolean;
};

export type AnalyzeOutput = {
  scores: {
    overall: number;        // 0..100
    ats: number;            // 0..100
    keyword_match: number;  // 0..100
    impact: number;         // 0..100
    clarity: number;        // 0..100
  };
  matched_keywords: string[];
  missing_keywords: string[];
  flags: string[];
  fix_list: string[];
  suggested_rewrites: string[];
  tailored_summary: string;
};

// =========== Analysis ===========

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { redactPII = false } = input;
  const weights = withDefaultWeights(input.weights);

  // Normalize both sides BEFORE tokenization; keep originals for rewrites/summary.
  const resumeN = normalize(input.resumeText);
  const jdN = normalize(input.jd);

  // Extract “terms” (tokens + phrases)
  const resumeTokens = tokenize(resumeN);
  const jdTokens = tokenize(jdN);

  const resumeSet = toSet(resumeTokens);
  const jdSet = toSet(jdTokens);

  // Mine candidate keywords from JD (bigrams+unigrams, filtered)
  const jdKeyPhrases = extractKeyPhrases(jdTokens);
  const resKeyPhrases = extractKeyPhrases(resumeTokens);

  // Match phrases first, then fall back to tokens with fuzzy credit
  const { matched, missing } = matchKeywords(jdKeyPhrases, resKeyPhrases, jdSet, resumeSet);

  // Heuristic scoring buckets (industry-agnostic)
  const atsScore = scoreATS(input.resumeText);
  const impactScore = scoreImpact(input.resumeText);
  const clarityScore = scoreClarity(input.resumeText);
  const keywordScore = Math.round((matched.length / Math.max(1, matched.length + missing.length)) * 100);

  const overall = weighted([
    [atsScore, weights.ats],
    [keywordScore, weights.keyword_match],
    [impactScore, weights.impact],
    [clarityScore, weights.clarity],
  ]);

  // Flags & fixes
  const flags = buildFlags(input.resumeText);
  const fix_list = flags.map(f => `Fix: ${f}`);

  // Suggested rewrites (transform some lines into stronger bullets)
  const suggested_rewrites = suggestRewrites(input.resumeText);

  // Tailored summary aligned to JD
  const tailored_summary = buildSummary(input.resumeText, input.jd, keywordScore, matched.length);

  // Redact PII AFTER analysis so it doesn’t break matching
  const postProcess = (s: string) => (redactPII ? redact(s) : s);
  return {
    scores: {
      overall,
      ats: atsScore,
      keyword_match: keywordScore,
      impact: impactScore,
      clarity: clarityScore,
    },
    matched_keywords: matched.map(postProcess),
    missing_keywords: missing.map(postProcess),
    flags: flags.map(postProcess),
    fix_list: fix_list.map(postProcess),
    suggested_rewrites: suggested_rewrites.map(postProcess),
    tailored_summary: postProcess(tailored_summary),
  };
}

// =========== Normalization & tokenization ===========

export function normalize(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")              // dashes
    .replace(/[“”„‟]/g, '"')                       // quotes
    .replace(/[‘’‚‛]/g, "'")                       // apostrophes
    .replace(/\u00A0/g, " ")                       // NBSP
    .replace(/[|•·●▪▶►]/g, " ")                    // bullets
    .replace(/[()]/g, " ")
    .replace(/[-_/\\]/g, " ")                      // separators
    .replace(/\.(js|ts|tsx|jsx)\b/g, " $1 ")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "and","or","the","a","an","for","of","to","with","in","on","at","by","from","as","is","are","be","our","we","you","their","they","i",
  "company","role","position","candidate","seeking","opportunity","responsibilities","requirements","skills","experience"
]);

// Aliases across industries (extensible)
const ALIAS: Record<string, string> = {
  // tech
  "nextjs": "next.js", "next": "next.js",
  "node": "node.js", "nodejs": "node.js",
  "typescript": "ts", "javascript": "js",
  "tailwindcss": "tailwind", "reactjs": "react",
  "mssql": "sql server", "ms sql": "sql server",
  "aws s3": "s3",
  // ops/finance/health/etc.
  "ap/ar": "ap ar", "a/p": "ap", "a/r": "ar",
  "ehr": "electronic health record", "hipaa": "hipaa",
  "gaap": "gaap",
};

function alias(tok: string): string {
  return ALIAS[tok] ?? tok;
}

export function tokenize(nrm: string): string[] {
  const words = nrm.split(" ").map(alias).filter(w => w && w.length > 1 && !STOP.has(w));
  // generate bigrams for phrase sensitivity
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return [...words, ...bigrams];
}

export function toSet(tokens: string[]) {
  const s = new Set<string>();
  for (const t of tokens) {
    const base = t.replace(/(ing|ed|es|s)$/,"");
    if (base.length > 1) s.add(base);
  }
  return s;
}

// Phrase extraction: prefer nouns/skills-ish tokens by crude filters
function extractKeyPhrases(tokens: string[]): string[] {
  const phrases = new Set<string>();
  for (const t of tokens) {
    if (t.includes(" ")) {
      // take bigrams that look like skills/terms
      if (!/^(and|the|for|with|from|over|under|into|onto)\b/.test(t)) {
        phrases.add(t);
      }
    } else {
      // keep singles that look like domain terms (letters+digits allowed)
      if (/^[a-z0-9.+#-]{2,}$/.test(t) && !STOP.has(t)) {
        phrases.add(t);
      }
    }
  }
  return [...phrases];
}

// Fuzzy match helper (cheap char-level distance)
function near(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let diff = 0, i = 0, j = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diff++;
    if (diff > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return true;
}

function matchKeywords(
  jdPhrases: string[],
  resPhrases: string[],
  jdSet: Set<string>,
  resSet: Set<string>
) {
  const matched: string[] = [];
  const missing: string[] = [];

  const resPhraseSet = new Set(resPhrases);
  // 1) phrase-level exact or near matches
  for (const p of jdPhrases) {
    const base = p.replace(/(ing|ed|es|s)$/,"");
    const found =
      resPhraseSet.has(p) ||
      [...resPhraseSet].some(q => near(q, p)) ||
      resSet.has(base);
    if (found) matched.push(p); else missing.push(p);
  }

  // 2) token-level: add any tokens present in JD but not in resume
  for (const tok of jdSet) {
    if (!resSet.has(tok)) missing.push(tok);
    else matched.push(tok);
  }

  // Dedup & keep concise
  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 200);
  return {
    matched: uniq(matched),
    missing: uniq(missing.filter(m => !matched.includes(m))),
  };
}

// =========== Scoring heuristics (industry-agnostic) ===========

function scoreATS(resumeRaw: string): number {
  // proxy for structure: presence of common sections + bullet usage + contact block
  const r = resumeRaw.toLowerCase();
  let pts = 0;
  if (/\bsummary|objective\b/.test(r)) pts += 15;
  if (/\beducation\b/.test(r)) pts += 15;
  if (/\bexperience|employment|work history\b/.test(r)) pts += 20;
  if (/\bskills\b/.test(r)) pts += 15;
  if (/[-*•▪●]/.test(resumeRaw)) pts += 10; // bullets
  if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/.test(r)) pts += 10; // email
  if (/\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/.test(r)) pts += 5; // phone
  if (/\bgithub|linkedin|portfolio|http/.test(r)) pts += 10;
  return clamp(Math.round(pts), 0, 100);
}

function scoreImpact(resumeRaw: string): number {
  // reward quantified bullets and action verbs
  const lower = resumeRaw.toLowerCase();
  const actionVerbs = ["built","led","reduced","increased","optimized","designed","developed","deployed","automated","delivered","launched","implemented","streamlined","improved","created","managed"];
  const verbHits = actionVerbs.reduce((acc,v)=>acc + (lower.includes(v) ? 1 : 0), 0);

  const metricsHits = (resumeRaw.match(/\b\d+(\.\d+)?%|\b\d{2,}(?:k|m)?\b/gi) || []).length; // % or big numbers
  const bullets = (resumeRaw.match(/[-*•▪●]/g) || []).length;

  const raw = 30 + Math.min(40, metricsHits*6) + Math.min(20, verbHits*4) + Math.min(10, Math.floor(bullets/5)*2);
  return clamp(raw, 0, 100);
}

function scoreClarity(resumeRaw: string): number {
  // simplistic readability proxy: sentence length & passive voice hints
  const text = resumeRaw.replace(/\s+/g," ").trim();
  const sentences = text.split(/[.!?]\s/).filter(Boolean);
  const avgLen = sentences.length ? text.split(/\s+/).length / sentences.length : 18;
  let score = 100;
  if (avgLen > 28) score -= Math.min(40, (avgLen - 28) * 2);
  const passive = (text.match(/\b(was|were|been|being|be)\b\s+\w+ed\b/gi) || []).length;
  score -= Math.min(30, passive*3);
  return clamp(Math.round(score), 0, 100);
}

function weighted(pairs: Array<[number, number]>): number {
  const sumW = pairs.reduce((a,[,w])=>a+w,0) || 1;
  const v = pairs.reduce((a,[s,w])=>a+(s*w),0) / sumW;
  return clamp(Math.round(v), 0, 100);
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// =========== Flags, fixes, rewrites, summary ===========

function buildFlags(raw: string): string[] {
  const flags: string[] = [];
  const r = raw.toLowerCase();
  if (!/\bsummary|objective\b/.test(r)) flags.push("Add a brief Professional Summary (2–3 lines).");
  if (!/\beducation\b/.test(r)) flags.push("Add an Education section.");
  if (!/\bexperience|employment|work history\b/.test(r)) flags.push("Add an Experience section.");
  if (!/\bskills\b/.test(r)) flags.push("Add a Skills section.");
  const bullets = (raw.match(/[-*•▪●]/g) || []).length;
  if (bullets < 6) flags.push("Use bullet points for readability and scannability.");
  if (!/\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/.test(r) && !/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/.test(r)) {
    flags.push("Ensure contact info (email/phone) is present and selectable.");
  }
  return flags.slice(0, 10);
}

function suggestRewrites(raw: string): string[] {
  // Transform some lines into metric-led, verb-first bullets
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length < 40 || out.length >= 6) continue;
    const rewritten = rewriteLine(line);
    if (rewritten) out.push(rewritten);
  }
  return out;
}

function rewriteLine(line: string): string | null {
  // If line lacks a metric, add a metric prompt
  const startsPassive = /\b(was|were|been|being|be)\b/i.test(line);
  const hasMetric = /\b\d+(\.\d+)?%|\b\d{2,}(?:k|m)?\b/i.test(line);
  let base = line.replace(/^[-*•▪●]\s*/, "").trim();
  if (startsPassive) base = base.replace(/\b(was|were|been|being|be)\b\s*/i, "");
  const tmpl = `• ${capitalize(firstVerb(base))} ${restAfterFirstVerb(base)}${hasMetric ? "" : " — quantify impact (%, $, time, or volume)."}`
    .replace(/\s+/g, " ")
    .trim();
  return tmpl.length > 40 ? tmpl : null;
}

function firstVerb(s: string): string {
  const words = s.split(/\s+/);
  const w = words[0] || "Delivered";
  return capitalize(w.replace(/[^\w-]/g,""));
}
function restAfterFirstVerb(s: string): string {
  return s.split(/\s+/).slice(1).join(" ") || "measurable outcomes for stakeholders.";
}
function capitalize(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function buildSummary(resumeRaw: string, jdRaw: string, kwScore: number, matchedCount: number): string {
  const focus = kwScore >= 60 ? "strong alignment" : kwScore >= 35 ? "partial alignment" : "foundational alignment";
  return `Results-driven professional with ${focus} to the role; matched ${matchedCount} JD terms. Emphasize quantified outcomes and the most relevant tools/frameworks referenced in the job description.`;
}

// =========== PII Redaction (post-analysis) ===========

function redact(s: string): string {
  return s
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\bhttps?:\/\/\S+\b/gi, "[REDACTED_URL]");
}

function withDefaultWeights(w?: AnalyzeInput["weights"]) {
  return {
    ats: w?.ats ?? 0.3,
    keyword_match: w?.keyword_match ?? 0.35,
    impact: w?.impact ?? 0.2,
    clarity: w?.clarity ?? 0.15,
  };
}
