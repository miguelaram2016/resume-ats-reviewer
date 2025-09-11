export type Weights = { ats: number; keyword_match: number; impact: number; clarity: number };
export const defaultWeights: Weights = { ats: 0.30, keyword_match: 0.35, impact: 0.20, clarity: 0.15 };