// lib/analyzer.ts
import { matchKeywords, calculateKeywordScore } from "./keywordMatcher";
import { scoreATS, scoreImpact, scoreClarity } from "./scorers";
import { buildFlags } from "./flags";
import { suggestRewrites } from "./rewriter";
import { buildSummary } from "./summary";
import type { AnalyzeInput, AnalyzeOutput, Weights } from "./types";
import {
  analyzeKeywordDensity,
  scoreSections,
  analyzeSkills,
  checkQuantification,
  checkFormat,
  generateSuggestions,
} from "./enhancedAnalysis";
import { generateImprovements } from "./resumeImprover";
import { analyzeStandalone } from "./standaloneAnalysis";

const DEFAULT_WEIGHTS: Weights = { ats: 0.3, keyword_match: 0.35, impact: 0.2, clarity: 0.15 };

function redact(s: string): string {
  return s.replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\bhttps?:\/\/\S+\b/gi, "[REDACTED_URL]");
}

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const { redactPII = false } = input;
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };
  
  // Check if running in standalone mode (no JD provided)
  const isStandaloneMode = !input.jd || input.jd.trim().length === 0;
  
  // If standalone mode, run standalone analysis and return
  if (isStandaloneMode) {
    const standaloneResult = analyzeStandalone(input.resumeText);
    
    // Calculate overall score for standalone mode
    const overall = Math.round(
      (standaloneResult.structure_score * 0.2) +
      (standaloneResult.formatting_score * 0.25) +
      (standaloneResult.completeness_score * 0.25) +
      (standaloneResult.clarity_score * 0.15) +
      (standaloneResult.impact_score * 0.15)
    );
    
    const post = (s: string) => (redactPII ? redact(s) : s);
    const CAP = 10;
    
    // Convert detected skills to arrays
    const allSkills = [
      ...standaloneResult.detected_skills.hard,
      ...standaloneResult.detected_skills.soft,
      ...standaloneResult.detected_skills.tools,
      ...standaloneResult.detected_skills.languages,
      ...standaloneResult.detected_skills.frameworks
    ];
    
    // Get quantifiable achievements
    const quantifiedExamples = standaloneResult.quantifiable_achievements
      .filter(a => a.has_number)
      .slice(0, 3)
      .map(a => a.text);
    
    return {
      mode: 'standalone',
      scores: {
        overall,
        ats: standaloneResult.formatting_score,
        keyword_match: 0, // No JD to match against
        impact: standaloneResult.impact_score,
        clarity: standaloneResult.clarity_score,
      },
      matched_keywords: [],
      missing_keywords: [],
      flags: [],
      fix_list: standaloneResult.potential_issues.map(i => `${i.severity.toUpperCase()}: ${i.message}`),
      suggested_rewrites: [],
      tailored_summary: '',
      matched_total: 0,
      missing_total: 0,
      
      // Enhanced fields (with defaults for standalone)
      match_rate: 0,
      keyword_density: [],
      section_scores: standaloneResult.detected_sections.map(s => ({
        section: s.name,
        score: s.present ? (s.quality === 'excellent' ? 100 : s.quality === 'good' ? 75 : s.quality === 'fair' ? 50 : 25) : 0,
        keywords_matched: []
      })),
      suggestions: standaloneResult.general_suggestions.map(post),
      hard_skills: {
        matched: standaloneResult.detected_skills.hard.slice(0, CAP),
        missing: [],
        match_rate: standaloneResult.detected_skills.hard.length > 0 ? 100 : 0,
      },
      soft_skills: {
        matched: standaloneResult.detected_skills.soft.slice(0, CAP),
        missing: [],
        match_rate: standaloneResult.detected_skills.soft.length > 0 ? 100 : 0,
      },
      quantification: {
        has_numbers: standaloneResult.quantifiable_achievements.some(a => a.has_number),
        percentage: standaloneResult.quantifiable_achievements.length > 0 
          ? Math.round((standaloneResult.quantifiable_achievements.filter(a => a.has_number).length / standaloneResult.quantifiable_achievements.length) * 100)
          : 0,
        examples: quantifiedExamples,
      },
      format_score: {
        score: standaloneResult.formatting_score,
        issues: standaloneResult.ats_friendly.issues,
        has_tables: standaloneResult.ats_friendly.issues.some(i => i.toLowerCase().includes('table')),
        has_columns: standaloneResult.ats_friendly.issues.some(i => i.toLowerCase().includes('column')),
        has_headers_footers: standaloneResult.ats_friendly.issues.some(i => i.toLowerCase().includes('header') || i.toLowerCase().includes('footer')),
        has_graphics: false,
      },
      ats_findings: standaloneResult.ats_friendly.issues.map(i => ({
        ok: false,
        label: i,
        category: 'format' as const,
        priority: 'warning' as const
      })),
      ats_categories: {
        format: { passed: standaloneResult.formatting_score, total: 100 }
      },
      parsing_rate: 100,
      word_count: input.resumeText.split(/\s+/).length,
      char_count: input.resumeText.length,
      file_type_suggestion: null,
      section_completion: {
        score: standaloneResult.completeness_score,
        required: ['Contact Info', 'Summary', 'Experience', 'Education', 'Skills'],
        found: standaloneResult.detected_sections.filter(s => s.present).map(s => s.name),
      },
      
      // Standalone-specific results
      standalone_analysis: {
        structure_score: standaloneResult.structure_score,
        formatting_score: standaloneResult.formatting_score,
        completeness_score: standaloneResult.completeness_score,
        clarity_score: standaloneResult.clarity_score,
        impact_score: standaloneResult.impact_score,
        detected_sections: standaloneResult.detected_sections,
        missing_sections: standaloneResult.missing_sections,
        detected_skills: standaloneResult.detected_skills,
        quantifiable_achievements: standaloneResult.quantifiable_achievements,
        potential_issues: standaloneResult.potential_issues,
        general_suggestions: standaloneResult.general_suggestions,
        ats_friendly: standaloneResult.ats_friendly,
      },
      improvements: {
        bulletRewrites: [],
        summarySuggestions: [],
        skillsToAdd: [],
        experienceImprovements: [],
        formattingAdvice: standaloneResult.ats_friendly.recommendations.map(r => ({
          category: 'ATS Compatibility',
          issue: '',
          suggestion: r,
          priority: standaloneResult.ats_friendly.is_ats_friendly ? 'info' as const : 'warning' as const
        })),
        overallActionPlan: standaloneResult.general_suggestions,
      },
    };
  }
  
  // === FULL MODE (with JD) ===
  const { matched, missing } = matchKeywords(input.resumeText, input.jd);
  const keywordScore = calculateKeywordScore(matched, missing);
  
  // Get ATS score with file info for 20+ checks
  const atsResult = scoreATS(input.resumeText, input.hints?.resume, input.fileInfo);
  
  const impactScore = scoreImpact(input.resumeText, input.hints?.resume);
  const clarityScore = scoreClarity(input.resumeText);
  
  // Use the new ATS score (which now includes 20+ checks)
  const atsScore = atsResult.score;
  
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

  // === ENHANCED ANALYSIS ===
  
  // 1. Match Rate %
  const matchRate = keywordScore;

  // 2. Keyword Density Analysis
  const keywordDensity = analyzeKeywordDensity(input.resumeText, matched);

  // 3. Section-by-Section Scoring
  const sectionScores = scoreSections(input.resumeText, matched);

  // 4. Hard/Soft Skills Split
  const skillAnalysis = analyzeSkills(input.resumeText, [...matched, ...missing]);

  // 5. Quantification Check
  const quantification = checkQuantification(input.resumeText);

  // 6. Format Score
  const formatScore = checkFormat(input.resumeText);

  // 7. Improvement Suggestions (enhanced with ATS findings)
  const suggestions = generateSuggestions(
    matchRate,
    missing,
    skillAnalysis.hard,
    skillAnalysis.soft,
    quantification,
    formatScore,
    sectionScores
  );

  // 8. Add ATS findings to suggestions based on priority
  const criticalFindings = atsResult.findings.filter(f => !f.ok && f.priority === 'critical');
  const warningFindings = atsResult.findings.filter(f => !f.ok && f.priority === 'warning');
  
  criticalFindings.forEach(f => {
    suggestions.unshift(`🔴 CRITICAL: ${f.label}${f.note ? ' - ' + f.note : ''}`);
  });
  warningFindings.forEach(f => {
    suggestions.unshift(`🟡 WARNING: ${f.label}${f.note ? ' - ' + f.note : ''}`);
  });
  
  // 9. Generate AI-Powered Improvement Suggestions
  const outputForImprovements = {
    scores: { overall, ats: atsScore, keyword_match: keywordScore, impact: impactScore, clarity: clarityScore },
    matched_keywords: matched.slice(0, CAP),
    missing_keywords: missing.slice(0, CAP),
    hard_skills: skillAnalysis.hard,
    soft_skills: skillAnalysis.soft,
    quantification: quantification,
  };
  const aiImprovements = generateImprovements(input.resumeText, input.jd, outputForImprovements);

  // Calculate parsing rate (how much of the resume was readable)
  const textLength = input.resumeText.length;
  const words = (input.resumeText.match(/\b\w+\b/g) || []).length;
  const parsingRate = Math.min(100, Math.round((words / 500) * 100)); // Assume 500 words is 100%

  // Word count analysis
  const wordCount = words;
  const charCount = textLength;
  
  // File type suggestion
  const fileTypeSuggestion = input.fileInfo?.fileName?.toLowerCase().endsWith('.docx') 
    ? 'Consider converting to PDF for better ATS compatibility. PDFs preserve formatting better and are more widely supported by ATS systems.'
    : input.fileInfo?.fileName?.toLowerCase().endsWith('.pdf')
    ? 'PDF is the recommended format for ATS. Good choice!'
    : null;

  // Section completion check
  const requiredSections = ['experience', 'education', 'skills'];
  const foundSections = requiredSections.filter(section => 
    new RegExp(`\\b${section}\\b`, 'i').test(input.resumeText)
  );
  const sectionCompletion = Math.round((foundSections.length / requiredSections.length) * 100);

  return {
    mode: input.jd ? 'full' : 'standalone',
    scores: { overall, ats: atsScore, keyword_match: keywordScore, impact: impactScore, clarity: clarityScore },
    matched_keywords: matched.slice(0, CAP).map(post),
    missing_keywords: missing.slice(0, CAP).map(post),
    flags: flags.map(post),
    fix_list: flags.map(f => `Fix: ${f}`).map(post),
    suggested_rewrites: suggestedRewrites.map(post),
    tailored_summary: post(tailoredSummary),
    matched_total: matched.length,
    missing_total: missing.length,
    // Enhanced fields
    match_rate: matchRate,
    keyword_density: keywordDensity,
    section_scores: sectionScores,
    suggestions: suggestions.map(post),
    hard_skills: {
      matched: skillAnalysis.hard.matched.slice(0, CAP),
      missing: skillAnalysis.hard.missing.slice(0, CAP),
      match_rate: skillAnalysis.hard.match_rate,
    },
    soft_skills: {
      matched: skillAnalysis.soft.matched.slice(0, CAP),
      missing: skillAnalysis.soft.missing.slice(0, CAP),
      match_rate: skillAnalysis.soft.match_rate,
    },
    quantification: quantification,
    format_score: formatScore,
    // New: 20+ ATS check findings
    ats_findings: atsResult.findings.map(f => ({
      ...f,
      label: post(f.label),
      note: f.note ? post(f.note) : undefined
    })),
    ats_categories: atsResult.categories,
    parsing_rate: parsingRate,
    word_count: wordCount,
    char_count: charCount,
    file_type_suggestion: fileTypeSuggestion,
    section_completion: {
      score: sectionCompletion,
      required: requiredSections,
      found: foundSections,
    },
    // AI-Powered Improvements
    improvements: {
      bulletRewrites: aiImprovements.bulletRewrites.map(b => ({
        ...b,
        original: post(b.original),
        improved: post(b.improved),
      })),
      summarySuggestions: aiImprovements.summarySuggestions.map(s => ({
        ...s,
        current: s.current ? post(s.current) : undefined,
        suggested: post(s.suggested),
      })),
      skillsToAdd: aiImprovements.skillsToAdd,
      experienceImprovements: aiImprovements.experienceImprovements,
      formattingAdvice: aiImprovements.formattingAdvice,
      overallActionPlan: aiImprovements.overallActionPlan,
    },
  };
}

function weightedScore(pairs: Array<[number, number]>): number {
  const sumW = pairs.reduce((a, [, w]) => a + w, 0) || 1;
  const v = pairs.reduce((a, [s, w]) => a + (s * w), 0) / sumW;
  return Math.max(0, Math.min(100, Math.round(v)));
}
