// lib/scorers/impact.ts
import type { DocHints } from "../types";

const ACTION_VERBS = ["built", "led", "reduced", "increased", "optimized", "designed", "developed", "deployed", "automated", "delivered", "launched", "implemented", "streamlined", "improved", "created", "managed", "achieved", "saved", "grew", "transformed"];

export function scoreImpact(resumeRaw: string, hints?: DocHints): number {
  const lower = resumeRaw.toLowerCase();
  const verbHits = ACTION_VERBS.reduce((acc, v) => acc + (lower.includes(v) ? 1 : 0), 0);
  const metricsMatches = resumeRaw.match(/\b\d+(\.\d+)?%|\b\d{2,}(?:k|m)?\b/gi) || [];
  const bulletCount = hints?.bullets?.length ?? (resumeRaw.match(/[-*•▪●]/g) || []).length;
  const raw = 30 + Math.min(40, metricsMatches.length * 6) + Math.min(20, verbHits * 4) + Math.min(10, Math.floor(bulletCount / 5) * 2);
  return Math.max(0, Math.min(100, Math.round(raw)));
}
