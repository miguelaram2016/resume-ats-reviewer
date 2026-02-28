// lib/summary.ts
export function buildSummary(_resumeRaw: string, _jdRaw: string, kwScore: number, matchedCount: number): string {
  const focus = kwScore >= 60 ? "strong alignment" : kwScore >= 35 ? "partial alignment" : "foundational alignment";
  return `Results-driven professional with ${focus} to the role; matched ${matchedCount} JD terms. Emphasize quantified outcomes and the most relevant tools/frameworks referenced in the job description.`;
}
