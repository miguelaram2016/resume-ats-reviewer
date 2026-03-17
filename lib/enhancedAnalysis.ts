// lib/enhancedAnalysis.ts
// Enhanced ATS analysis features

import type { 
  SectionDensity, 
  SectionScore, 
  SkillAnalysis, 
  QuantificationResult, 
  FormatScore 
} from './types';

// Common hard/technical skills patterns
const HARD_SKILL_PATTERNS: RegExp[] = [
  // Programming languages
  /python|java|javascript|typescript|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|perl|sql|html|css/i,
  // Frameworks & libraries
  /react|angular|vue|node\.?js|express|django|flask|spring|hibernate|rails|laravel|\.net|asp\.net/i,
  // Cloud & DevOps
  /aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|gitlab|github|ci\/cd|devops|mlops/i,
  // Databases
  /mysql|postgresql|mongodb|redis|elasticsearch|cassandra|oracle|sql server|firebase|dynamodb/i,
  // Data & ML
  /machine learning|deep learning|tensorflow|pytorch|pandas|numpy|scikit|keras|nlp|computer vision|data analysis|data science|tableau|power bi/i,
  // Tools & platforms
  /linux|unix|windows|macos|git|jira|confluence|agile|scrum|kanban|figma|sketch/i,
  // Security
  /cybersecurity|penetration testing|firewall|encryption|oauth|ssl|tls|owasp/i,
  // Other tech
  /api|rest|graphql|microservices|jwt|websocket|tcp|udp|http|https|dns/i,
];

// Common soft skills patterns
const SOFT_SKILL_PATTERNS: RegExp[] = [
  /leadership|teamwork|communication|collaboration|problem.?solving|critical thinking/i,
  /adaptability|time management|creativity|innovation|analytical|attention to detail/i,
  /project management|organization|planning|multitasking|prioritization/i,
  /interpersonal|customer service|stakeholder|presentation|negotiation/i,
  /accountability|reliability|dependability|initiative|self.?motivated/i,
  /mentoring|coaching|training|facilitating|delegating/i,
  /decision making|strategic|vision|goal.?oriented|results.?oriented/i,
  /emotional intelligence|empathy|patience|conflict resolution/i,
];

// Section detection patterns - more flexible to catch headers like "Professional Summary"
const SECTION_PATTERNS: Record<string, RegExp> = {
  'Summary': /^(summary|objective|profile|about|professional\s*summary|career\s*summary):?/i,
  'Experience': /^(experience|employment|work\s*history|professional\s*experience|background|work\s*experience):?/i,
  'Education': /^(education|academic|qualifications|degrees?|educational):?/i,
  'Skills': /^(skills|technical\s*skills|competencies|expertise|technologies|technical):?/i,
  'Projects': /^(projects?|portfolio|work):?/i,
  'Certifications': /^(certifications?|certificates?|licenses?|credentials):?/i,
};

/**
 * Detect sections in resume text
 */
export function detectSections(text: string): { name: string; content: string }[] {
  const lines = text.split('\n');
  const sections: { name: string; content: string }[] = [];
  let currentSection = 'Header';
  let currentContent: string[] = [];

  for (const line of lines) {
    let matchedSection = false;
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line.trim())) {
        if (currentContent.length > 0) {
          sections.push({ name: currentSection, content: currentContent.join('\n') });
        }
        currentSection = name;
        currentContent = [line];
        matchedSection = true;
        break;
      }
    }
    if (!matchedSection) {
      currentContent.push(line);
    }
  }
  
  // Push final section
  if (currentContent.length > 0) {
    sections.push({ name: currentSection, content: currentContent.join('\n') });
  }

  return sections;
}

/**
 * Calculate keyword density per section
 */
export function analyzeKeywordDensity(text: string, keywords: string[]): SectionDensity[] {
  const sections = detectSections(text);
  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
  
  const densities: SectionDensity[] = [];
  let totalKeywords = 0;

  for (const section of sections) {
    const words = section.content.toLowerCase().split(/\s+/);
    let keywordCount = 0;
    
    for (const word of words) {
      if (keywordSet.has(word) || [...keywordSet].some(k => word.includes(k))) {
        keywordCount++;
      }
    }
    
    totalKeywords += keywordCount;
    densities.push({
      section: section.name,
      keyword_count: keywordCount,
      percentage: 0,
    });
  }

  // Calculate percentages
  for (const d of densities) {
    d.percentage = totalKeywords > 0 ? Math.round((d.keyword_count / totalKeywords) * 100) : 0;
  }

  return densities.filter(d => d.keyword_count > 0).sort((a, b) => b.keyword_count - a.keyword_count);
}

/**
 * Score each section individually
 */
export function scoreSections(text: string, matchedKeywords: string[]): SectionScore[] {
  const sections = detectSections(text);
  const keywordSet = new Set(matchedKeywords.map(k => k.toLowerCase()));
  
  const scores: SectionScore[] = [];

  for (const section of sections) {
    const sectionLower = section.content.toLowerCase();
    
    const keywordsInSection: string[] = [];
    for (const kw of keywordSet) {
      if (sectionLower.includes(kw)) {
        keywordsInSection.push(kw);
      }
    }

    // Score based on keyword presence and content length
    const contentLength = sectionLower.split(/\s+/).length;
    const keywordRatio = contentLength > 0 ? keywordsInSection.length / Math.min(contentLength / 10, 20) : 0;
    const score = Math.min(100, Math.round(keywordRatio * 100));

    scores.push({
      section: section.name,
      score,
      keywords_matched: keywordsInSection.slice(0, 10),
    });
  }

  return scores;
}

/**
 * Analyze hard vs soft skills
 */
export function analyzeSkills(resumeText: string, jdKeywords: string[]): { hard: SkillAnalysis; soft: SkillAnalysis } {
  const resumeLower = resumeText.toLowerCase();
  
  // Extract hard skills from JD
  const hardSkillsInJD: string[] = [];
  const softSkillsInJD: string[] = [];
  
  for (const kw of jdKeywords) {
    const kwLower = kw.toLowerCase();
    const isHard = HARD_SKILL_PATTERNS.some(p => p.test(kwLower));
    const isSoft = SOFT_SKILL_PATTERNS.some(p => p.test(kwLower));
    
    if (isHard) hardSkillsInJD.push(kw);
    else if (isSoft) softSkillsInJD.push(kw);
  }

  // Find matched/missing hard skills
  const hardMatched: string[] = [];
  const hardMissing: string[] = [];
  
  for (const skill of hardSkillsInJD) {
    if (resumeLower.includes(skill.toLowerCase())) {
      hardMatched.push(skill);
    } else {
      hardMissing.push(skill);
    }
  }

  // Find matched/missing soft skills
  const softMatched: string[] = [];
  const softMissing: string[] = [];
  
  for (const skill of softSkillsInJD) {
    if (resumeLower.includes(skill.toLowerCase())) {
      softMatched.push(skill);
    } else {
      softMissing.push(skill);
    }
  }

  return {
    hard: {
      matched: hardMatched,
      missing: hardMissing,
      match_rate: hardSkillsInJD.length > 0 
        ? Math.round((hardMatched.length / hardSkillsInJD.length) * 100) 
        : 0,
    },
    soft: {
      matched: softMatched,
      missing: softMissing,
      match_rate: softSkillsInJD.length > 0 
        ? Math.round((softMatched.length / softSkillsInJD.length) * 100) 
        : 0,
    },
  };
}

/**
 * Check for quantification (numbers/metrics in bullets)
 */
export function checkQuantification(text: string): QuantificationResult {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^[-*•▪●]/.test(line.trim()));
  
  // Patterns for numbers/metrics
  const numberPatterns = [
    /\d+(?:\.\d+)?%?/,
    /\$\d+(?:,\d{3})*(?:\.\d{2})?/,
    /\d+(?:\.\d+)?\s*(?:million|billion|k|M|B)/i,
    /\d+\s*(?:years?|yrs?|months?|mos?)/i,
    /(?:increased|decreased|improved|reduced|grew|achieved|delivered|managed|led)/i,
    /(?:roi|revenue|profit|cost|savings)/i,
  ];

  let hasNumbers = 0;
  const examples: string[] = [];

  for (const line of bulletLines) {
    const hasNumber = numberPatterns.some(p => p.test(line));
    if (hasNumber) {
      hasNumbers++;
      if (examples.length < 5) {
        examples.push(line.trim().substring(0, 80));
      }
    }
  }

  const percentage = bulletLines.length > 0 
    ? Math.round((hasNumbers / bulletLines.length) * 100) 
    : 0;

  return {
    has_numbers: hasNumbers > 0,
    percentage,
    examples,
  };
}

/**
 * Check resume format for ATS compatibility
 */
export function checkFormat(text: string): FormatScore {
  const issues: string[] = [];
  let score = 100;

  // Check for tables (common ATS killer) - require actual table structure, not just chars
  // Look for: +----+----+ or multiple box-drawing chars forming grid patterns
  const tableRowPattern = /\+[-=]+\+\s*[\n│┌┐└┘├┤┬┴┼|]+/.test(text);
  const hasManyBoxChars = (text.match(/[│┌┐└┘├┤┬┴┼]{15,}/g) || []).length > 0;
  const hasTables = tableRowPattern || hasManyBoxChars;
  if (hasTables) {
    issues.push('Tables detected - remove tables as ATS cannot parse them');
    score -= 20;
  }

  // Check for multiple columns (often problematic)
  const columnIndicators = (text.match(/[│█■◆]{20,}/g) || []).length;
  if (columnIndicators > 3) {
    issues.push('Multiple columns detected - use single-column layout');
    score -= 15;
  }

  // Check for headers/footers (often lost)
  const hasHeadersFooters = /^(header|footer|page\s*\d+|confidential|copyright)/im.test(text);
  if (hasHeadersFooters) {
    issues.push('Headers/footers detected - ensure critical info is in body');
    score -= 10;
  }

  // Check for graphics/icons indicators
  const graphicChars = (text.match(/[▀▄■□▪●○◆◇★☆✓✗✘►▼◄]/g) || []).length;
  const hasGraphics = graphicChars > 10;
  if (hasGraphics) {
    issues.push('Graphics/icons detected - ATS may not properly read them');
    score -= 15;
  }

  // Check for text boxes - look for actual PDF text box artifacts, not common words
  // PDF text boxes often appear as special characters or patterns in extracted text
  const hasTextBoxes = /\x00[\x00-\xFF]{5,}/.test(text) || // Binary artifacts from text boxes
                       /\bttext\s*box\b/i.test(text) ||     // Actual "text box" mentions
                       /\btextbox\d+\b/i.test(text);         // textbox1, textbox2, etc.
  if (hasTextBoxes) {
    issues.push('Text boxes detected - use plain text instead');
    score -= 15;
  }

  // Check line length - removed false positive check for "short lines = column layout"
  // Short lines are normal in resumes (bullets, headings, etc.)
  // Only flag obvious multi-column indicators

  return {
    score: Math.max(0, score),
    issues,
    has_tables: hasTables,
    has_columns: columnIndicators > 10,
    has_headers_footers: hasHeadersFooters,
    has_graphics: hasGraphics,
  };
}

/**
 * Generate improvement suggestions based on analysis
 */
export function generateSuggestions(
  matchRate: number,
  missingKeywords: string[],
  hardSkills: SkillAnalysis,
  softSkills: SkillAnalysis,
  quantification: QuantificationResult,
  format: FormatScore,
  sections: SectionScore[]
): string[] {
  const suggestions: string[] = [];

  // Match rate suggestions
  if (matchRate < 50) {
    suggestions.push('⚠️ Low match rate - add more keywords from the job description');
  } else if (matchRate < 70) {
    suggestions.push('📈 Good progress - add a few more relevant keywords');
  } else if (matchRate >= 90) {
    suggestions.push('🎯 Excellent keyword matching!');
  }

  // Missing keywords suggestions
  if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 5);
    suggestions.push(`🔑 Add these missing keywords: ${topMissing.join(', ')}${missingKeywords.length > 5 ? '...' : ''}`);
  }

  // Hard skills
  if (hardSkills.match_rate < 50 && hardSkills.missing.length > 0) {
    suggestions.push(`💻 Add missing hard skills: ${hardSkills.missing.slice(0, 3).join(', ')}`);
  }

  // Soft skills
  if (softSkills.match_rate < 50 && softSkills.missing.length > 0) {
    suggestions.push(`🤝 Add missing soft skills: ${softSkills.missing.slice(0, 3).join(', ')}`);
  }

  // Quantification
  if (quantification.percentage < 30) {
    suggestions.push('📊 Low quantification - add numbers/metrics to demonstrate impact');
  } else if (quantification.percentage >= 70) {
    suggestions.push('📊 Strong quantification with metrics!');
  }

  // Format issues
  if (format.score < 80) {
    suggestions.push('⚠️ Format issues detected: ' + format.issues[0]);
  }

  // Section-specific suggestions
  for (const section of sections) {
    if (section.score < 30 && section.section !== 'Header') {
      suggestions.push(`📝 Consider adding more relevant content to ${section.section}`);
    }
  }

  return suggestions;
}
