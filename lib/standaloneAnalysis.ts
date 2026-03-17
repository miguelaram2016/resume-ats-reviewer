// lib/standaloneAnalysis.ts
// Standalone resume analysis (without JD)

import type { 
  StandaloneAnalysis, 
  DetectedSection, 
  DetectedSkills,
  QuantifiableAchievement,
  PotentialIssue,
  AtsFriendlyCheck
} from './types';

// Required sections for a complete resume
// Contact Info uses a function to detect actual email/phone patterns, not just keywords
const REQUIRED_SECTIONS: { name: string; pattern: RegExp | ((text: string) => boolean) }[] = [
  { name: 'Contact Info', pattern: (text: string) => {
    // Check for actual email/phone patterns (not just the words)
    const hasEmail = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(text);
    const hasPhone = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text);
    // Also accept if raw "email" or "phone" labels exist
    const hasLabel = /(?:email|phone|mobile|cell|tel|mobile):/i.test(text);
    return hasEmail || hasPhone || hasLabel;
  }},
  { name: 'Summary', pattern: /(?:summary|objective|profile|about\s*me|professional\s*summary)/i },
  { name: 'Experience', pattern: /(?:experience|employment|work\s*history|professional\s*experience|career)/i },
  { name: 'Education', pattern: /(?:education|academic|degree|university|college|school)/i },
  { name: 'Skills', pattern: /(?:skills|technical\s*skills|competencies|expertise|technologies)/i },
];

// Optional but recommended sections
const RECOMMENDED_SECTIONS = [
  { name: 'Projects', pattern: /(?:projects?|portfolio)/i },
  { name: 'Certifications', pattern: /(?:certifications?|certificates?|licenses?)/i },
  { name: 'Languages', pattern: /(?:languages?|spoken)/i },
];

// Hard skills patterns
const HARD_SKILL_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'Programming Languages',
    patterns: [
      /\b(python|java|javascript|typescript|c\+\+|c#|c\s*sharp|go|golang|rust|ruby|php|swift|kotlin|scala|perl|r|matlab|sql|html|css)\b/gi
    ]
  },
  {
    category: 'Frameworks & Libraries',
    patterns: [
      /\b(react|angular|vue|node\.?js|express|django|flask|spring|hibernate|rails|laravel|\.net|asp\.net|next\.?js|flutter|react\s*native)\b/gi
    ]
  },
  {
    category: 'Cloud & DevOps',
    patterns: [
      /\b(aws|azure|gcp|google\s*cloud|docker|kubernetes|k8s|terraform|ansible|jenkins|gitlab|github|ci\/cd|devops|mlops)\b/gi
    ]
  },
  {
    category: 'Databases',
    patterns: [
      /\b(mysql|postgresql|mongodb|redis|elasticsearch|cassandra|oracle|sql\s*server|firebase|dynamodb|couchdb|neo4j)\b/gi
    ]
  },
  {
    category: 'Data & ML',
    patterns: [
      /\b(machine\s*learning|deep\s*learning|tensorflow|pytorch|pandas|numpy|scikit|kaggle|nlp|computer\s*vision|data\s*analysis|data\s*science|tableau|power\s*bi|excel)\b/gi
    ]
  },
  {
    category: 'Tools & Platforms',
    patterns: [
      /\b(linux|unix|windows|macos|git|jira|confluence|agile|scrum|kanban|figma|sketch|photoshop|illustrator)\b/gi
    ]
  },
  {
    category: 'Security',
    patterns: [
      /\b(cybersecurity|penetration\s*testing|firewall|encryption|oauth|ssl|tls|owasp)\b/gi
    ]
  },
  {
    category: 'API & Protocols',
    patterns: [
      /\b(api|rest|graphql|microservices|jwt|websocket|tcp|udp|http|https|dns)\b/gi
    ]
  },
];

// Soft skills patterns
const SOFT_SKILL_PATTERNS = [
  /\b(leadership|teamwork|communication|collaboration|problem[-\s]solving|critical\s*thinking)\b/gi,
  /\b(adaptability|time\s*management|creativity|innovation|analytical|attention\s*to\s*detail)\b/gi,
  /\b(project\s*management|organization|planning|multitasking|prioritization)\b/gi,
  /\b(interpersonal|customer\s*service|stakeholder|presentation|negotiation)\b/gi,
  /\b(accountability|reliability|dependability|initiative|self[-\s]motivated)\b/gi,
  /\b(mentoring|coaching|training|facilitating|delegating)\b/gi,
  /\b(decision\s*making|strategic|vision|goal[-\s]oriented|results[-\s]oriented)\b/gi,
  /\b(emotional\s*intelligence|empathy|patience|conflict\s*resolution)\b/gi,
];

// Action verbs for achievements
const ACTION_VERBS = [
  'achieved', 'led', 'managed', 'developed', 'created', 'implemented', 'designed', 'built',
  'increased', 'decreased', 'improved', 'reduced', 'optimized', 'delivered', 'executed',
  'launched', 'launch', 'spearheaded', 'directed', 'coordinated', 'collaborated',
  'analyzed', 'generated', 'produced', 'presented', 'facilitated', 'trained', 'mentored'
];

/**
 * Main function to analyze resume without JD
 */
export function analyzeStandalone(resumeText: string): StandaloneAnalysis {
  // 1. Detect sections
  const detectedSections = detectSections(resumeText);
  
  // 2. Detect skills
  const detectedSkills = detectAllSkills(resumeText);
  
  // 3. Check quantifiable achievements
  const quantifiableAchievements = checkQuantifiableAchievements(resumeText);
  
  // 4. Check ATS friendliness
  const atsFriendly = checkAtsFriendliness(resumeText, detectedSections);
  
  // 5. Identify potential issues
  const potentialIssues = identifyPotentialIssues(resumeText, detectedSections, detectedSkills, quantifiableAchievements);
  
  // 6. Generate general suggestions
  const generalSuggestions = generateGeneralSuggestions(detectedSections, detectedSkills, quantifiableAchievements, atsFriendly);
  
  // 7. Calculate scores
  const structureScore = calculateStructureScore(detectedSections);
  const formattingScore = atsFriendly.score;
  const completenessScore = calculateCompletenessScore(detectedSections);
  const clarityScore = calculateClarityScore(resumeText);
  const impactScore = calculateImpactScore(quantifiableAchievements);
  
  // 8. Determine missing sections
  const missingSections = REQUIRED_SECTIONS
    .filter(s => !detectedSections.find(ds => ds.name.toLowerCase() === s.name.toLowerCase() || ds.quality !== 'missing'))
    .map(s => s.name);
  
  return {
    structure_score: structureScore,
    formatting_score: formattingScore,
    completeness_score: completenessScore,
    clarity_score: clarityScore,
    impact_score: impactScore,
    detected_sections: detectedSections,
    missing_sections: missingSections,
    detected_skills: detectedSkills,
    quantifiable_achievements: quantifiableAchievements,
    potential_issues: potentialIssues,
    general_suggestions: generalSuggestions,
    ats_friendly: atsFriendly,
  };
}

/**
 * Detect sections in the resume
 */
function detectSections(text: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  const lines = text.split('\n');
  const textLower = text.toLowerCase();
  
  // Helper to find the start line index of a section header
  // Uses flexible matching - tries exact name first, then case-insensitive includes
  const findHeaderLine = (sectionName: string, pattern: RegExp): number => {
    // First try exact match (for cases like "Experience" matching "EXPERIENCE")
    const exactPattern = new RegExp(`^\\s*${sectionName}\\s*$`, 'i');
    for (let i = 0; i < lines.length; i++) {
      if (exactPattern.test(lines[i])) return i;
    }
    // Then try pattern match (for cases like "Summary" matching "PROFESSIONAL SUMMARY")
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) return i;
    }
    return -1;
  };

  // Helper to collect content lines until the next header (required or recommended)
  const collectContent = (startIdx: number): string[] => {
    const content: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Stop if this line looks like a new section header (all caps or ends with colon)
      if (/^[A-Z ]+$/.test(line) || /:\s*$/.test(line)) break;
      content.push(line);
    }
    return content;
  };

  // Check required sections
  for (const required of REQUIRED_SECTIONS) {
    let present = false;
    let wordCount = 0;
    // Determine if pattern is a RegExp or a function
    if (typeof required.pattern === 'function') {
      present = required.pattern(text);
    } else {
      const match = textLower.match(required.pattern as RegExp);
      present = !!match;
    }
    if (present) {
      // Get the pattern to use for header matching
      const pattern = typeof required.pattern === 'function' 
        ? /(?:email|phone|mobile|cell|tel|mobile):/i // fallback for contact info
        : required.pattern as RegExp;
      const headerIdx = findHeaderLine(required.name, pattern);
      const sectionLines = headerIdx >= 0 ? collectContent(headerIdx) : [];
      wordCount = sectionLines.join(' ').split(/\s+/).filter(Boolean).length;
      let quality: DetectedSection['quality'] = 'good';
      if (wordCount > 100) quality = 'excellent';
      else if (wordCount > 50) quality = 'good';
      else if (wordCount > 20) quality = 'fair';
      else quality = 'poor';
      sections.push({
        name: required.name,
        present: true,
        quality,
        word_count: wordCount,
        notes: wordCount < 20 ? 'Section is quite short, consider expanding' : undefined
      });
    } else {
      sections.push({
        name: required.name,
        present: false,
        quality: 'missing'
      });
    }
  }
  
  // Check recommended sections
  for (const recommended of RECOMMENDED_SECTIONS) {
    const match = textLower.match(recommended.pattern as RegExp);
    if (match) {
      const headerIdx = findHeaderLine(recommended.name, recommended.pattern as RegExp);
      const sectionLines = headerIdx >= 0 ? collectContent(headerIdx) : [];
      const wordCount = sectionLines.join(' ').split(/\s+/).filter(Boolean).length;
      sections.push({
        name: recommended.name,
        present: true,
        quality: wordCount > 30 ? 'good' : 'fair',
        word_count: wordCount
      });
    }
  }
  
  return sections;
}

/**
 * Find content around a matched pattern
 */
function findSectionContent(lines: string[], matchIndex: number): string[] {
  const content: string[] = [];
  let charCount = 0;
  
  // Find approximate line
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1;
    if (charCount >= matchIndex) {
      // Found the section header, get content until next section
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (line && /^[A-Z]/.test(line)) break; // New section likely
        content.push(line);
      }
      break;
    }
  }
  
  return content;
}

/**
 * Detect all skills from resume
 */
function detectAllSkills(resumeText: string): DetectedSkills {
  const result: DetectedSkills = {
    hard: [],
    soft: [],
    tools: [],
    languages: [],
    frameworks: [],
    other: []
  };
  
  const foundSkills = new Set<string>();
  
  // Extract hard skills by category
  for (const category of HARD_SKILL_PATTERNS) {
    for (const pattern of category.patterns) {
      const matches = resumeText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const skill = match.toLowerCase();
          if (!foundSkills.has(skill)) {
            foundSkills.add(skill);
            
            if (category.category === 'Programming Languages') {
              result.languages.push(skill);
            } else if (category.category === 'Frameworks & Libraries') {
              result.frameworks.push(skill);
            } else if (category.category === 'Tools & Platforms') {
              result.tools.push(skill);
            } else {
              result.hard.push(skill);
            }
          }
        }
      }
    }
  }
  
  // Extract soft skills
  for (const pattern of SOFT_SKILL_PATTERNS) {
    const matches = resumeText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const skill = match.toLowerCase();
        if (!foundSkills.has(skill)) {
          foundSkills.add(skill);
          result.soft.push(skill);
        }
      }
    }
  }
  
  // Deduplicate
  result.hard = [...new Set(result.hard)];
  result.soft = [...new Set(result.soft)];
  result.tools = [...new Set(result.tools)];
  result.languages = [...new Set(result.languages)];
  result.frameworks = [...new Set(result.frameworks)];
  
  return result;
}

/**
 * Check quantifiable achievements
 */
function checkQuantifiableAchievements(text: string): QuantifiableAchievement[] {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^[-*•▪●]/.test(line.trim()));
  const achievements: QuantifiableAchievement[] = [];
  
  // Number patterns
  const numberPatterns = [
    /\d+(?:\.\d+)?%?/,
    /\$\d+(?:,\d{3})*(?:\.\d{2})?/,
    /\d+(?:\.\d+)?\s*(?:million|billion|k|M|B)/i,
    /\d+\s*(?:years?|yrs?|months?|mos?)/i,
    /\d+\s*(?:clients?|customers?|users?|employees?|teams?|projects?)/i,
  ];
  
  for (const line of bulletLines.slice(0, 20)) { // Check first 20 bullets
    const trimmed = line.trim().substring(0, 150);
    if (trimmed.length < 10) continue;
    
    const hasNumber = numberPatterns.some(p => p.test(trimmed));
    const hasActionVerb = ACTION_VERBS.some(v => trimmed.toLowerCase().startsWith(v.toLowerCase()) || trimmed.toLowerCase().includes(' ' + v.toLowerCase()));
    
    let quality: QuantifiableAchievement['quality'] = 'poor';
    if (hasNumber && hasActionVerb) quality = 'excellent';
    else if (hasNumber || hasActionVerb) quality = 'good';
    else quality = 'fair';
    
    achievements.push({
      text: trimmed,
      has_number: hasNumber,
      has_action_verb: hasActionVerb,
      quality
    });
  }
  
  return achievements;
}

/**
 * Check ATS friendliness
 */
function checkAtsFriendliness(text: string, sections: DetectedSection[]): AtsFriendlyCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  // Check for tables (ATS killer) - require actual table structure
  const tableRowPattern = /\+[-=]+\+\s*[\n│┌┐└┘├┤┬┴┼|]+/.test(text);
  const hasManyBoxChars = (text.match(/[│┌┐└┘├┤┬┴┼]{15,}/g) || []).length > 0;
  if (tableRowPattern || hasManyBoxChars) {
    issues.push('Tables detected - ATS cannot parse them');
    recommendations.push('Convert tables to plain text or bullet points');
    score -= 25;
  }
  
  // Check for headers/footers
  if (/^(header|footer|page\s*\d+)/im.test(text)) {
    issues.push('Headers/footers detected - may lose critical info');
    recommendations.push('Move important information from headers to main body');
    score -= 10;
  }
  
  // Check for text boxes - look for actual PDF artifacts
  const hasTextBoxes = /\x00[\x00-\xFF]{5,}/.test(text) ||
                       /\btext\s*box\b/i.test(text) ||
                       /\btextbox\d+\b/i.test(text);
  if (hasTextBoxes) {
    issues.push('Text boxes detected - ATS cannot read them');
    recommendations.push('Replace text boxes with plain text');
    score -= 20;
  }
  
  // Check for columns
  const columnIndicators = (text.match(/[│█■◆]{20,}/g) || []).length;
  if (columnIndicators > 3) {
    issues.push('Multiple columns detected - may cause parsing issues');
    recommendations.push('Use single-column layout for better ATS compatibility');
    score -= 15;
  }
  
  // Check for special characters that might cause issues
  if (/[™®©°§¶©]/.test(text)) {
    issues.push('Special characters detected that may cause parsing issues');
    score -= 5;
  }
  
  // Check file format recommendation
  const isPdf = text.includes('%PDF') || text.includes('/Type /Page');
  if (!isPdf && text.length > 1000) {
    recommendations.push('Consider saving as PDF for best ATS compatibility');
  }
  
  // Check contact info
  const hasEmail = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(text);
  const hasPhone = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text);
  
  if (!hasEmail || !hasPhone) {
    issues.push('Missing contact information');
    recommendations.push('Include email and phone number in header');
    score -= 10;
  }
  
  // Good signs
  if (score >= 80) {
    recommendations.push('Resume format looks good for ATS systems');
  }
  
  return {
    score: Math.max(0, score),
    is_ats_friendly: score >= 70,
    issues,
    recommendations
  };
}

/**
 * Identify potential issues
 */
function identifyPotentialIssues(
  text: string, 
  sections: DetectedSection[], 
  skills: DetectedSkills,
  achievements: QuantifiableAchievement[]
): PotentialIssue[] {
  const issues: PotentialIssue[] = [];
  const wordCount = text.split(/\s+/).length;
  
  // Length issues
  if (wordCount < 200) {
    issues.push({
      type: 'length',
      severity: 'critical',
      message: `Resume is very short (${wordCount} words). Aim for 400-800 words.`
    });
  } else if (wordCount < 400) {
    issues.push({
      type: 'length',
      severity: 'warning',
      message: `Resume could be longer (${wordCount} words). Consider adding more detail.`
    });
  } else if (wordCount > 1500) {
    issues.push({
      type: 'length',
      severity: 'warning',
      message: `Resume is quite long (${wordCount} words). Consider trimming for better impact.`
    });
  }
  
  // Check missing critical sections
  const missingCritical = sections.filter(s => !s.present && REQUIRED_SECTIONS.some(r => r.name === s.name));
  if (missingCritical.length > 0) {
    issues.push({
      type: 'content',
      severity: 'critical',
      message: `Missing sections: ${missingCritical.map(s => s.name).join(', ')}`
    });
  }
  
  // Check skills
  if (skills.hard.length + skills.soft.length < 3) {
    issues.push({
      type: 'content',
      severity: 'warning',
      message: 'Limited skills detected. Add a dedicated skills section.'
    });
  }
  
  // Check quantifiable achievements
  const goodAchievements = achievements.filter(a => a.quality === 'excellent' || a.quality === 'good');
  if (goodAchievements.length < 3) {
    issues.push({
      type: 'content',
      severity: 'warning',
      message: 'Add more quantifiable achievements with numbers and metrics'
    });
  }
  
  // Check summary
  const hasSummary = sections.find(s => s.name.toLowerCase() === 'summary');
  if (!hasSummary || hasSummary.quality === 'missing') {
    issues.push({
      type: 'content',
      severity: 'info',
      message: 'Consider adding a professional summary at the top'
    });
  }
  
  return issues;
}

/**
 * Generate general suggestions
 */
function generateGeneralSuggestions(
  sections: DetectedSection[],
  skills: DetectedSkills,
  achievements: QuantifiableAchievement[],
  atsFriendly: AtsFriendlyCheck
): string[] {
  const suggestions: string[] = [];
  
  // Summary suggestions
  const summary = sections.find(s => s.name.toLowerCase() === 'summary');
  if (!summary || summary.quality === 'missing') {
    suggestions.push('💡 Add a professional summary (2-3 sentences) at the top of your resume');
  } else if (summary.word_count && summary.word_count < 30) {
    suggestions.push('💡 Expand your summary to better highlight your value proposition');
  }
  
  // Skills suggestions
  const totalSkills = skills.hard.length + skills.soft.length;
  if (totalSkills < 5) {
    suggestions.push('💡 Add more skills - both technical and soft skills are valued');
  }
  
  if (skills.hard.length > 0) {
    suggestions.push(`💡 Great! You have ${skills.hard.length} technical skills listed`);
  }
  
  if (skills.soft.length === 0) {
    suggestions.push('💡 Add soft skills like leadership, communication, or problem-solving');
  }
  
  // Quantification suggestions
  const quantifiedCount = achievements.filter(a => a.has_number).length;
  const totalAchievements = achievements.length;
  
  if (totalAchievements > 0) {
    const percentage = Math.round((quantifiedCount / totalAchievements) * 100);
    if (percentage < 50) {
      suggestions.push(`💡 Only ${percentage}% of your bullets have metrics - add numbers to show impact`);
    } else {
      suggestions.push(`💡 Good quantification - ${percentage}% of bullets have metrics!`);
    }
  }
  
  // ATS suggestions
  if (!atsFriendly.is_ats_friendly) {
    for (const rec of atsFriendly.recommendations.slice(0, 2)) {
      suggestions.push(`⚠️ ${rec}`);
    }
  }
  
  // Formatting
  if (sections.length < 4) {
    suggestions.push('💡 Use clear section headers (Experience, Education, Skills, etc.)');
  }
  
  // Action verbs
  const withActionVerbs = achievements.filter(a => a.has_action_verb).length;
  if (totalAchievements > 0 && withActionVerbs < totalAchievements * 0.5) {
    suggestions.push('💡 Start bullet points with action verbs (Led, Developed, Increased, etc.)');
  }
  
  return suggestions;
}

/**
 * Calculate structure score
 */
function calculateStructureScore(sections: DetectedSection[]): number {
  let score = 0;
  let maxScore = 0;
  
  // Required sections count more
  for (const section of sections) {
    maxScore += 20;
    if (section.present) {
      switch (section.quality) {
        case 'excellent': score += 20; break;
        case 'good': score += 15; break;
        case 'fair': score += 10; break;
        case 'poor': score += 5; break;
        case 'missing': score += 0; break;
      }
    }
  }
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Calculate completeness score
 */
function calculateCompletenessScore(sections: DetectedSection[]): number {
  const presentRequired = sections.filter(s => 
    s.present && REQUIRED_SECTIONS.some(r => r.name.toLowerCase() === s.name.toLowerCase())
  ).length;
  
  return Math.round((presentRequired / REQUIRED_SECTIONS.length) * 100);
}

/**
 * Calculate clarity score
 */
function calculateClarityScore(text: string): number {
  let score = 100;
  
  // Check average line length
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const avgLength = lines.reduce((sum, l) => sum + l.trim().length, 0) / lines.length;
  
  if (avgLength > 100) {
    score -= 15; // Lines too long
  }
  
  // Check for excessive capitalization
  const capsCount = (text.match(/[A-Z]{4,}/g) || []).length;
  if (capsCount > 5) {
    score -= 10;
  }
  
  // Check for paragraphs (good for readability)
  const paragraphs = text.split(/\n\n+/).length;
  if (paragraphs < 3) {
    score -= 10;
  }
  
  // Check bullet usage
  const bullets = (text.match(/^[-*•▪●]/gm) || []).length;
  if (bullets < 3 && lines.length > 10) {
    score -= 15; // Not using bullets for experience
  }
  
  return Math.max(0, score);
}

/**
 * Calculate impact score
 */
function calculateImpactScore(achievements: QuantifiableAchievement[]): number {
  if (achievements.length === 0) return 0;
  
  const excellent = achievements.filter(a => a.quality === 'excellent').length;
  const good = achievements.filter(a => a.quality === 'good').length;
  const fair = achievements.filter(a => a.quality === 'fair').length;
  
  const score = (excellent * 100 + good * 70 + fair * 40) / achievements.length;
  return Math.round(score);
}
