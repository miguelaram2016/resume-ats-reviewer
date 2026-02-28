// lib/scorers/clarity.ts
export function scoreClarity(resumeRaw: string): number {
  const text = resumeRaw.replace(/\s+/g, " ").trim();
  const sentences = text.split(/[.!?]\s/).filter(Boolean);
  const wordCount = text.split(/\s+/).length;
  const avgLen = sentences.length ? wordCount / sentences.length : 18;
  let score = 100;
  if (avgLen > 28) score -= Math.min(40, (avgLen - 28) * 2);
  const passiveMatches = text.match(/\b(was|were|been|being|be)\b\s+\w+ed\b/gi) || [];
  score -= Math.min(30, passiveMatches.length * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}
