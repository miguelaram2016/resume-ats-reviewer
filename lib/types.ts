// lib/types.ts
// All TypeScript types for the ATS analyzer

export interface AnalyzeInput {
  resumeText: string;
  jd: string;
  weights?: Weights;
  redactPII?: boolean;
  hints?: {
    resume?: DocHints;
    jd?: DocHints;
  };
}

export interface Weights {
  ats?: number;
  keyword_match?: number;
  impact?: number;
  clarity?: number;
}

export interface AnalyzeOutput {
  scores: Scores;
  matched_keywords: string[];
  missing_keywords: string[];
  flags: string[];
  fix_list: string[];
  suggested_rewrites: string[];
  tailored_summary: string;
  matched_total?: number;
  missing_total?: number;
}

export interface Scores {
  overall: number;
  ats: number;
  keyword_match: number;
  impact: number;
  clarity: number;
}

export interface DocHints {
  emails: string[];
  phones: string[];
  links: string[];
  headings: string[];
  bullets: string[];
  charCount: number;
  method: string;
}

export interface MatchResult {
  matched: string[];
  missing: string[];
}
