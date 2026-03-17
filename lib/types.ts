// lib/types.ts
// All TypeScript types for the ATS analyzer

export interface AnalyzeInput {
  resumeText: string;
  jd?: string;  // Optional for standalone mode
  weights?: Weights;
  redactPII?: boolean;
  hints?: {
    resume?: DocHints;
    jd?: DocHints;
  };
  fileInfo?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
}

export interface Weights {
  ats?: number;
  keyword_match?: number;
  impact?: number;
  clarity?: number;
}

export interface AnalyzeOutput {
  // Mode indicator
  mode: 'full' | 'standalone';
  
  scores: Scores;
  matched_keywords: string[];
  missing_keywords: string[];
  flags: string[];
  fix_list: string[];
  suggested_rewrites: string[];
  tailored_summary: string;
  matched_total?: number;
  missing_total?: number;
  // New enhanced fields
  match_rate?: number;
  keyword_density?: SectionDensity[];
  section_scores?: SectionScore[];
  suggestions?: string[];
  hard_skills?: SkillAnalysis;
  soft_skills?: SkillAnalysis;
  quantification?: QuantificationResult;
  format_score?: FormatScore;
  // New: Detailed ATS findings (20+ checks)
  ats_findings?: AtsFinding[];
  ats_categories?: Record<string, { passed: number; total: number }>;
  parsing_rate?: number; // What % of resume was parseable
  
  // Additional metrics
  word_count?: number;
  char_count?: number;
  file_type_suggestion?: string;
  section_completion?: {
    score: number;
    required: string[];
    found: string[];
  };
  
  // New: AI-Powered Improvement Suggestions
  improvements?: ImprovementSuggestions;
  improved_summary?: string;
  
  // Standalone mode results
  standalone_analysis?: StandaloneAnalysis;
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

export interface SectionDensity {
  section: string;
  keyword_count: number;
  percentage: number;
}

export interface SectionScore {
  section: string;
  score: number;
  keywords_matched: string[];
}

export interface SkillAnalysis {
  matched: string[];
  missing: string[];
  match_rate: number;
}

export interface QuantificationResult {
  has_numbers: boolean;
  percentage: number;
  examples: string[];
}

export interface FormatScore {
  score: number;
  issues: string[];
  has_tables: boolean;
  has_columns: boolean;
  has_headers_footers: boolean;
  has_graphics: boolean;
}

// New: Improvement Suggestions Types
export interface ImprovementSuggestions {
  bulletRewrites: BulletRewrite[];
  summarySuggestions: SummarySuggestion[];
  skillsToAdd: string[];
  experienceImprovements: ExperienceImprovement[];
  formattingAdvice: FormattingAdvice[];
  overallActionPlan: string[];
}

export interface BulletRewrite {
  original: string;
  improved: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SummarySuggestion {
  current?: string;
  suggested: string;
  isNew: boolean;
  keyPoints: string[];
}

export interface ExperienceImprovement {
  section: string;
  original: string;
  suggestions: string[];
}

export interface FormattingAdvice {
  category: string;
  issue: string;
  suggestion: string;
  priority: 'critical' | 'warning' | 'info';
}

// New: ATS Findings types
export interface AtsFinding {
  ok: boolean;
  label: string;
  note?: string;
  category: 'format' | 'content' | 'structure' | 'keywords';
  priority?: 'critical' | 'warning' | 'info';
}

export interface AtsResult {
  score: number;
  findings: AtsFinding[];
  categories: Record<string, { passed: number; total: number }>;
}

// Standalone mode types
export interface StandaloneAnalysis {
  structure_score: number;
  formatting_score: number;
  completeness_score: number;
  clarity_score: number;
  impact_score: number;
  
  detected_sections: DetectedSection[];
  missing_sections: string[];
  detected_skills: DetectedSkills;
  quantifiable_achievements: QuantifiableAchievement[];
  potential_issues: PotentialIssue[];
  general_suggestions: string[];
  ats_friendly: AtsFriendlyCheck;
}

export interface DetectedSection {
  name: string;
  present: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'missing';
  word_count?: number;
  notes?: string;
}

export interface DetectedSkills {
  hard: string[];
  soft: string[];
  tools: string[];
  languages: string[];
  frameworks: string[];
  other: string[];
}

export interface QuantifiableAchievement {
  text: string;
  has_number: boolean;
  has_action_verb: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface PotentialIssue {
  type: 'length' | 'format' | 'content' | 'keyword';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface AtsFriendlyCheck {
  score: number;
  is_ats_friendly: boolean;
  issues: string[];
  recommendations: string[];
}
