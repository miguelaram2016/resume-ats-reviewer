// lib/analyze.ts
// Analyzer (industry-agnostic). Now optionally consumes DocHints from Paperweight.

export type AnalyzeInput = {
  resumeText: string;
  jd: string;
  weights?: {
    ats?: number;
    keyword_match?: number;
    impact?: number;
    clarity?: number;
  };
  redactPII?: boolean;
  hints?: {
    resume?: DocHints;
    jd?: DocHints;
  };
};

export type AnalyzeOutput = {
  scores: { overall: number; ats: number; keyword_match: number; impact: number; clarity: number; };
  matched_keywords: string[];
  missing_keywords: string[];
  flags: string[];
  fix_list: string[];
  suggested_rewrites: string[];
  tailored_summary: string;
  // extras (optional; UI can ignore)
  matched_total?: number;
  missing_total?: number;
};

export type DocHints = {
  pages?: number;
  info?: Record<string, any>;
  metadata?: Record<string, any>;
  emails: string[];
  phones: string[];
  links: string[];
  headings: string[];
  bullets: string[];
  charCount: number;
  method: "pdf-parse" | "utf8";
};

// ====================== MAIN ======================
export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { redactPII = false } = input;
  const weights = withDefaultWeights(input.weights);

  const resumeN = normalize(input.resumeText);
  const jdN     = normalize(input.jd);

  const resumeTokens = tokenize(resumeN);
  const jdTokens     = tokenize(jdN);

  const resumeSet = toSet(resumeTokens);
  const jdSet     = toSet(jdTokens);

  const jdKeyPhrases = extractKeyPhrases(jdTokens);
  const resKeyPhrases = extractKeyPhrases(resumeTokens);

  const { matched, missing } = matchKeywords(jdKeyPhrases, resKeyPhrases, jdSet, resumeSet);

  // Scoring with hints
  const atsScore     = scoreATS(input.resumeText, input.hints?.resume);
  const impactScore  = scoreImpact(input.resumeText, input.hints?.resume);
  const clarityScore = scoreClarity(input.resumeText, input.hints?.resume);
  const keywordScore = Math.round((matched.length / Math.max(1, matched.length + missing.length)) * 100);

  const overall = weighted([
    [atsScore,        weights.ats],
    [keywordScore,    weights.keyword_match],
    [impactScore,     weights.impact],
    [clarityScore,    weights.clarity],
  ]);

  const flags    = buildFlags(input.resumeText, input.hints?.resume);
  const fix_list = flags.map(f => `Fix: ${f}`);
  const suggested_rewrites = suggestRewrites(input.resumeText);

  const tailored_summary = buildSummary(input.resumeText, input.jd, keywordScore, matched.length);

  const cap = 10; // server-side cap (UI can "Show more" if you wire it)
  const matched_total = matched.length;
  const missing_total = missing.length;

  const post = (s: string) => (redactPII ? redact(s) : s);

  return {
    scores: { overall, ats: atsScore, keyword_match: keywordScore, impact: impactScore, clarity: clarityScore },
    matched_keywords: matched.slice(0, cap).map(post),
    missing_keywords: missing.slice(0, cap).map(post),
    flags: flags.map(post),
    fix_list: fix_list.map(post),
    suggested_rewrites: suggested_rewrites.map(post),
    tailored_summary: post(tailored_summary),
    matched_total,
    missing_total,
  };
}

// ====================== Normalization & tokens ======================
export function normalize(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[|•·●▪▶►]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[-_/\\]/g, " ")
    .replace(/\.(js|ts|tsx|jsx)\b/g, " $1 ")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "and","or","the","a","an","for","of","to","with","in","on","at","by","from","as","is","are","be","our","we","you","their","they","i",
  "company","role","position","candidate","seeking","opportunity","responsibilities","requirements","skills","experience"
]);

const ALIAS: Record<string,string> = {
  "nextjs":"next.js","next":"next.js",
  "node":"node.js","nodejs":"node.js",
  "typescript":"ts","javascript":"js",
  "tailwindcss":"tailwind","reactjs":"react",
  "mssql":"sql server","ms sql":"sql server",
  "aws s3":"s3","ap/ar":"ap ar","a/p":"ap","a/r":"ar",
  "ehr":"electronic health record"
};

function alias(tok: string) { return ALIAS[tok] ?? tok; }

export function tokenize(nrm: string): string[] {
  const words = nrm.split(" ").map(alias).filter(w => w && w.length > 1 && !STOP.has(w));
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) bigrams.push(`${words[i]} ${words[i+1]}`);
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

function extractKeyPhrases(tokens: string[]): string[] {
  const phrases = new Set<string>();
  for (const t of tokens) {
    if (t.includes(" ")) {
      if (!/^(and|the|for|with|from|over|under|into|onto)\b/.test(t)) phrases.add(t);
    } else {
      if (/^[a-z0-9.+#-]{2,}$/.test(t) && !STOP.has(t)) phrases.add(t);
    }
  }
  return [...phrases];
}

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
  for (const p of jdPhrases) {
    const base = p.replace(/(ing|ed|es|s)$/,"");
    const found = resPhraseSet.has(p) || [...resPhraseSet].some(q => near(q, p)) || resSet.has(base);
    if (found) matched.push(p); else missing.push(p);
  }

  for (const tok of jdSet) {
    if (!resSet.has(tok)) missing.push(tok); else matched.push(tok);
  }

  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 200);
  return {
    matched: uniq(matched),
    missing: uniq(missing.filter(m => !matched.includes(m))),
  };
}

// ====================== Scoring (use hints when present) ======================
function scoreATS(resumeRaw: string, hints?: DocHints): number {
  const r = resumeRaw.toLowerCase();
  let pts = 0;

  // Sections/headings — prefer hints
  const H = (hints?.headings || []).map(h => h.toLowerCase());
  const has = (k: string) => H.some(h => h.includes(k)) || r.includes(k);

  if (has("summary") || has("objective")) pts += 15;
  if (has("education")) pts += 15;
  if (has("experience") || has("employment") || has("work history")) pts += 20;
  if (has("skills")) pts += 15;

  // Contact/selectable
  if ((hints?.emails?.length || 0) > 0) pts += 10;
  if ((hints?.phones?.length || 0) > 0) pts += 5;
  if ((hints?.links?.length || 0) > 0 || /\bgithub|linkedin|portfolio|http/.test(r)) pts += 10;

  // Bullets — prefer hints
  const bulletCount = hints?.bullets?.length ?? (resumeRaw.match(/[-*•▪●]/g) || []).length;
  if (bulletCount > 0) pts += Math.min(10, Math.floor(bulletCount / 5) * 2);

  return clamp(Math.round(pts), 0, 100);
}

function scoreImpact(resumeRaw: string, hints?: DocHints): number {
  const lower = resumeRaw.toLowerCase();
  const actionVerbs = ["built","led","reduced","increased","optimized","designed","developed","deployed","automated","delivered","launched","implemented","streamlined","improved","created","managed"];
  const verbHits = actionVerbs.reduce((acc,v)=>acc + (lower.includes(v) ? 1 : 0), 0);
  const metricsHits = (resumeRaw.match(/\b\d+(\.\d+)?%|\b\d{2,}(?:k|m)?\b/gi) || []).length;
  const bullets = hints?.bullets?.length ?? (resumeRaw.match(/[-*•▪●]/g) || []).length;
  const raw = 30 + Math.min(40, metricsHits*6) + Math.min(20, verbHits*4) + Math.min(10, Math.floor(bullets/5)*2);
  return clamp(raw, 0, 100);
}

function scoreClarity(resumeRaw: string, _hints?: DocHints): number {
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

// ====================== Flags, rewrites, summary ======================
function buildFlags(raw: string, hints?: DocHints): string[] {
  const flags: string[] = [];
  const r = raw.toLowerCase();
  const H = (hints?.headings || []).map(h => h.toLowerCase());

  const has = (k: string) => H.some(h => h.includes(k)) || r.includes(k);

  if (!has("summary") && !has("objective")) flags.push("Add a brief Professional Summary (2–3 lines).");
  if (!has("education")) flags.push("Add an Education section.");
  if (!has("experience") && !has("employment") && !has("work history")) flags.push("Add an Experience section.");
  if (!has("skills")) flags.push("Add a Skills section.");

  const bullets = hints?.bullets?.length ?? (raw.match(/[-*•▪●]/g) || []).length;
  if (bullets < 6) flags.push("Use bullet points for readability and scannability.");
  if ((hints?.emails?.length || 0) === 0 && (hints?.phones?.length || 0) === 0) {
    flags.push("Ensure contact info (email/phone) is present and selectable.");
  }

  return flags.slice(0, 10);
}

function suggestRewrites(raw: string): string[] {
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

function buildSummary(_resumeRaw: string, _jdRaw: string, kwScore: number, matchedCount: number): string {
  const focus = kwScore >= 60 ? "strong alignment" : kwScore >= 35 ? "partial alignment" : "foundational alignment";
  return `Results-driven professional with ${focus} to the role; matched ${matchedCount} JD terms. Emphasize quantified outcomes and the most relevant tools/frameworks referenced in the job description.`;
}

// ====================== Redaction ======================
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
