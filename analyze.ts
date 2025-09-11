import { tfidfCosine, sentenceStats } from './text';
import { evaluateAts } from './atsRules';
import { matchKeywords } from './keywords';
import { redactPII as redact } from './pii';
import { defaultWeights, Weights } from './config';

export function analyze({ resumeText, jd, weights, redactPII }: { resumeText: string; jd: string; weights?: Weights; redactPII?: boolean }) {
  const W = weights || defaultWeights;
  // Keyword match
  const { matched, missing } = matchKeywords(resumeText, jd);
  const coverage = (matched.length / Math.max(1, matched.length + missing.length)) * 100;
  const jdSim = tfidfCosine(resumeText, jd);
  const keywordScore = Math.round(coverage * 0.6 + jdSim * 0.4);
  // Impact signals
  const nums = (resumeText.match(/\b\d+[.,]?\d*\b/g) || []).length;
  const pct = (resumeText.match(/%/g) || []).length;
  const money = (resumeText.match(/[$€£]/g) || []).length;
  const impactHits = nums + pct + money;
  const impactScore = Math.max(0, Math.min(100, Math.round((impactHits / 20) * 100)));
  // Clarity
  const { avgLen } = sentenceStats(resumeText);
  const lenScore = avgLen ? Math.max(0, Math.min(100, Math.round(100 - Math.max(0, avgLen - 18) * 4))) : 50;
  const passive = (resumeText.match(/\b(was|were|be|been|being)\b\s+\w+ed/gi) || []).length;
  const passivePenalty = Math.min(30, passive);
  const clarityScore = Math.max(0, Math.min(100, lenScore - passivePenalty));
  // ATS findings
  const { findings: atsFindings, score: atsScore } = evaluateAts({ text: resumeText });
  // Weighted overall
  const overall = Math.round(atsScore * W.ats + keywordScore * W.keyword_match + impactScore * W.impact + clarityScore * W.clarity);
  // Flags & fixes
  const flags: string[] = [];
  atsFindings.forEach((f) => {
    if (!f.ok) flags.push(f.label);
  });
  if (avgLen > 28) flags.push('Long sentences detected (>28 words)');
  if (passive > 5) flags.push('High passive voice ratio');
  const fix_list = flags.map((f) => `Fix: ${f}`);
  const suggested_rewrites = [
    'Lead with an action verb and include a concrete metric: “Increased lead conversion by 23% by…”.',
    'Replace passive phrasing with active voice and quantify scope (users, revenue, time).',
  ];
  const tailored_summary = `Results-driven professional aligned to the role; matched ${Math.round(coverage)}% of JD terms with ${Math.round(jdSim)} similarity. Emphasize quantified outcomes and relevant tech.`;
  const payload = {
    scores: { overall, ats: atsScore, keyword_match: keywordScore, impact: impactScore, clarity: clarityScore },
    flags,
    matched_keywords: matched.slice(0, 50),
    missing_keywords: missing.slice(0, 50),
    suggested_rewrites,
    tailored_summary,
    fix_list,
  };
  return redactPII ? deepRedact(payload) : payload;
}

function deepRedact(obj: any) {
  const json = JSON.stringify(obj);
  const redacted = redact(json);
  return JSON.parse(redacted);
}