// AI-Powered Resume Improvement Suggestions
// Rule-based generation with optional Ollama integration for advanced suggestions

import type { AnalyzeOutput } from './types';

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

// Action verbs by category for impact
const ACTION_VERBS = {
  leadership: ['Led', 'Directed', 'Managed', 'Coordinated', 'Supervised', 'Mentored', 'Trained', 'Built', 'Established', 'Created'],
  achievement: ['Achieved', 'Exceeded', 'Delivered', 'Produced', 'Generated', 'Increased', 'Improved', 'Reduced', 'Optimized', 'Transformed'],
  technical: ['Developed', 'Implemented', 'Designed', 'Built', 'Engineered', 'Architected', 'Integrated', 'Automated', 'Deployed', 'Maintained'],
  communication: ['Presented', 'Communicated', 'Collaborated', 'Negotiated', 'Facilitated', 'Influenced', 'Advised', 'Consulted'],
  results: ['Results:', 'Impact:', 'Outcome:', 'Achievement:', 'Outcome:', '$', '%', '×', 'ROI'],
};

// Weak words to avoid
const WEAK_WORDS = [
  'stuff', 'things', 'did', 'made', 'worked', 'helped', 'responsible for',
  'duties include', 'various', 'many', 'some', 'etc', 'other duties',
  'nice', 'good', 'great', 'bad', 'hard', 'easy', 'a lot', 'very'
];

// Strong alternatives
const STRONG_ALTERNATIVES: Record<string, string> = {
  'did': 'executed',
  'made': 'created',
  'helped': 'facilitated',
  'worked on': 'contributed to',
  'responsible for': 'owned',
  'managed': 'directed',
  'used': 'leveraged',
  'got': 'achieved',
  'tried': 'attempted',
  'maybe': 'potentially',
};

export function generateImprovements(
  resumeText: string,
  jd: string,
  analysis: Partial<AnalyzeOutput>
): ImprovementSuggestions {
  const bullets = extractBulletPoints(resumeText);
  const weakBullets = identifyWeakBullets(bullets);
  const matchedSkills = analysis.hard_skills?.matched || [];
  const missingSkills = analysis.hard_skills?.missing || [];
  const softMatched = analysis.soft_skills?.matched || [];
  const softMissing = analysis.soft_skills?.missing || [];

  return {
    bulletRewrites: generateBulletRewrites(weakBullets),
    summarySuggestions: generateSummarySuggestion(resumeText, jd, analysis),
    skillsToAdd: [...missingSkills, ...softMissing].slice(0, 10),
    experienceImprovements: generateExperienceImprovements(bullets),
    formattingAdvice: generateFormattingAdvice(analysis),
    overallActionPlan: generateActionPlan(analysis),
  };
}

function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if it's a bullet point
    if (/^[•\-\u2022◆▪*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[•\-\u2022◆▪*]\s/, '').replace(/^\d+\.\s/, ''));
    }
  }
  
  return bullets;
}

function identifyWeakBullets(bullets: string[]): { original: string; issues: string[] }[] {
  return bullets.map(bullet => {
    const issues: string[] = [];
    const lower = bullet.toLowerCase();
    
    // Check for weak words
    for (const weak of WEAK_WORDS) {
      if (lower.includes(weak)) {
        issues.push(`Contains weak word: "${weak}"`);
      }
    }
    
    // Check for missing action verb
    if (!/^(led|managed|developed|created|implemented|achieved|increased|reduced|delivered|built|directed|coordinated)/i.test(bullet)) {
      issues.push('Missing action verb at start');
    }
    
    // Check for missing quantification
    if (!/\d+%?|\$\d+|\d+x|\b\d+\b/.test(bullet)) {
      issues.push('No metrics or numbers');
    }
    
    // Check for passive voice
    if (/was|were|been|being|had|did/.test(lower) && !/\b(led|managed|developed|created)\b/.test(lower)) {
      issues.push('May use passive voice');
    }
    
    return { original: bullet, issues };
  }).filter(b => b.issues.length > 0);
}

function generateBulletRewrites(weakBullets: { original: string; issues: string[] }[]): BulletRewrite[] {
  return weakBullets.map(({ original, issues }) => {
    let improved = original;
    const reason = issues.join('; ');
    
    // Add action verb if missing
    if (issues.some(i => i.includes('action verb'))) {
      const context = detectContext(original);
      const verbs = ACTION_VERBS[context] || ACTION_VERBS.technical;
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      improved = `${verb} ${improved.charAt(0).toLowerCase() + improved.slice(1)}`;
    }
    
    // Add quantification if missing
    if (issues.some(i => i.includes('metrics'))) {
      const contextQuant = detectQuantification(original);
      improved += ` ${contextQuant}`;
    }
    
    // Replace weak words
    for (const [weak, strong] of Object.entries(STRONG_ALTERNATIVES)) {
      improved = improved.replace(new RegExp(`\\b${weak}\\b`, 'gi'), strong);
    }
    
    // Determine impact
    let impact: 'high' | 'medium' | 'low' = 'low';
    if (issues.length >= 3) impact = 'high';
    else if (issues.length >= 2) impact = 'medium';
    
    return {
      original,
      improved,
      reason,
      impact,
    };
  });
}

function detectContext(text: string): keyof typeof ACTION_VERBS {
  const lower = text.toLowerCase();
  if (/\b(team|lead|manage|mentor|supervise)\b/.test(lower)) return 'leadership';
  if (/\b(sales|revenue|customer|client|budget)\b/.test(lower)) return 'achievement';
  if (/\b(code|develop|build|implement|engineer|design|system)\b/.test(lower)) return 'technical';
  if (/\b(present|communicate|meet|discuss)\b/.test(lower)) return 'communication';
  return 'technical';
}

function detectQuantification(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(team|group|people|engineers)\b/.test(lower)) return '(led team of 5+)';
  if (/\b(increase|grow|improve)\b/.test(lower)) return '(achieved 20%+ improvement)';
  if (/\b(save|cut|reduce|optimize)\b/.test(lower)) return '(saved $X annually)';
  if (/\b(build|create|develop)\b/.test(lower)) return '(delivered to 1000+ users)';
  return '(measurable outcome)';
}

function generateSummarySuggestion(
  resumeText: string,
  jd: string,
  analysis: Partial<AnalyzeOutput>
): SummarySuggestion[] {
  const hasSummary = /summary|objective|profile|about/i.test(resumeText);
  const matchedKeywords = analysis.matched_keywords || [];
  const missingKeywords = analysis.missing_keywords || [];
  const skills = analysis.hard_skills?.matched || [];
  
  // Extract years of experience
  const yearsMatch = resumeText.match(/(\d+)\+?\s*(years?|yrs)/i);
  const years = yearsMatch ? yearsMatch[1] : '';
  
  // Extract job titles
  const titleMatch = resumeText.match(/(?:software|senior|junior|lead|principal)?\s*(?:engineer|developer|manager|analyst|designer)/i);
  const title = titleMatch ? titleMatch[0] : 'Professional';
  
  if (hasSummary) {
    // Extract current summary
    const summaryMatch = resumeText.match(/summary[\s:]*\n*([\s\S]{50,300})/i);
    const currentSummary = summaryMatch ? summaryMatch[1].trim() : undefined;
    
    return [{
      current: currentSummary,
      suggested: generateNewSummary(title, years, skills, matchedKeywords),
      isNew: false,
      keyPoints: [
        `${years ? years + '+ years' : 'Professional'} experience`,
        ...skills.slice(0, 3).map(s => `${s} expertise`),
        ...(missingKeywords.slice(0, 2).map(k => `Add ${k}`)),
      ],
    }];
  }
  
  return [{
    suggested: generateNewSummary(title, years, skills, matchedKeywords),
    isNew: true,
    keyPoints: [
      `${years ? years + '+ years' : 'Proven'} experience in ${skills.slice(0, 2).join(' & ')}`,
      `Track record of ${matchedKeywords.slice(0, 2).join(' & ')}`,
      'Strong communication and problem-solving skills',
    ],
  }];
}

function generateNewSummary(title: string, years: string, skills: string[], keywords: string[]): string {
  const parts: string[] = [];
  
  if (years) {
    parts.push(`${years}+ years of professional experience`);
  } else {
    parts.push('Results-driven professional');
  }
  
  if (skills.length > 0) {
    parts.push(`with expertise in ${skills.slice(0, 4).join(', ')}`);
  }
  
  if (keywords.length > 0) {
    parts.push(`proven success in ${keywords.slice(0, 3).join(', ')}`);
  }
  
  parts.push('seeking to deliver exceptional results');
  
  return parts.join(' ');
}

function generateExperienceImprovements(bullets: string[]): ExperienceImprovement[] {
  const improvements: ExperienceImprovement[] = [];
  
  // Group bullets by potential sections
  const sections = {
    leadership: bullets.filter(b => /\b(lead|manage|mentor|supervise|team)\b/i.test(b)),
    technical: bullets.filter(b => /\b(code|develop|build|implement|engineer|system)\b/i.test(b)),
    achievement: bullets.filter(b => /\b(achieve|increase|improve|deliver|produce|reduce)\b/i.test(b)),
  };
  
  for (const [section, sectionBullets] of Object.entries(sections)) {
    if (sectionBullets.length > 0) {
      improvements.push({
        section: section.charAt(0).toUpperCase() + section.slice(1),
        original: sectionBullets.slice(0, 2).join('; '),
        suggestions: getSectionSuggestions(section as keyof typeof sections),
      });
    }
  }
  
  return improvements.slice(0, 3);
}

function getSectionSuggestions(section: keyof typeof ACTION_VERBS): string[] {
  const suggestions: Record<string, string[]> = {
    leadership: [
      'Quantify team size and scope',
      'Include budget responsibility',
      'Add measurable outcomes',
    ],
    technical: [
      'Specify technologies used',
      'Mention team collaboration',
      'Include performance metrics',
    ],
    achievement: [
      'Add percentage improvements',
      'Include revenue/savings',
      'Show customer impact',
    ],
    communication: [
      'Include stakeholder count',
      'Add presentation audience size',
      'Show business impact',
    ],
    results: [
      'Be specific with numbers',
      'Include timeframe',
      'Show before/after metrics',
    ],
  };
  
  return suggestions[section] || suggestions.achievement;
}

function generateFormattingAdvice(analysis: Partial<AnalyzeOutput>): FormattingAdvice[] {
  const advice: FormattingAdvice[] = [];
  
  const wordCount = analysis.word_count || 0;
  if (wordCount < 250) {
    advice.push({
      category: 'Length',
      issue: 'Resume is too short',
      suggestion: 'Add more detail to experience sections. Aim for 250-500 words minimum.',
      priority: 'critical',
    });
  } else if (wordCount > 1400) {
    advice.push({
      category: 'Length',
      issue: 'Resume is too long',
      suggestion: 'Consider condensing. Keep most relevant experience to 1-2 pages.',
      priority: 'warning',
    });
  }
  
  const formatScore = analysis.format_score?.score || 100;
  if (formatScore < 70) {
    advice.push({
      category: 'Format',
      issue: 'Multiple format issues detected',
      suggestion: 'Convert to single-column PDF. Remove tables, text boxes, and headers/footers.',
      priority: 'critical',
    });
  }
  
  if (analysis.section_completion?.score < 100) {
    const missing = analysis.section_completion.required.filter(
      r => !analysis.section_completion?.found.includes(r)
    );
    advice.push({
      category: 'Sections',
      issue: `Missing sections: ${missing.join(', ')}`,
      suggestion: `Add ${missing.join(', ')} sections to improve completeness.`,
      priority: 'warning',
    });
  }
  
  if (analysis.quantification?.percentage && analysis.quantification.percentage < 50) {
    advice.push({
      category: 'Content',
      issue: 'Limited quantifiable achievements',
      suggestion: 'Add metrics (%, $, #) to at least 50% of your bullet points.',
      priority: 'warning',
    });
  }
  
  // General advice
  advice.push({
    category: 'Best Practices',
    issue: 'General improvements',
    suggestion: 'Use consistent tense (past for previous roles, present for current). Keep bullets under 2 lines.',
    priority: 'info',
  });
  
  return advice;
}

function generateActionPlan(analysis: Partial<AnalyzeOutput>): string[] {
  const plan: string[] = [];
  
  // Critical items first
  if (analysis.scores?.ats && analysis.scores.ats < 60) {
    plan.push('🔴 Fix ATS formatting issues (see Format Issues above)');
  }
  
  if (analysis.match_rate && analysis.match_rate < 50) {
    plan.push('🔴 Add missing keywords from JD to your resume');
  }
  
  if (analysis.section_completion?.score && analysis.section_completion.score < 100) {
    plan.push('🟡 Add missing sections: ' + analysis.section_completion.required
      .filter(r => !analysis.section_completion?.found.includes(r))
      .join(', '));
  }
  
  // Warning items
  if (analysis.quantification?.percentage && analysis.quantification.percentage < 50) {
    plan.push('🟡 Quantify your achievements with specific numbers');
  }
  
  if (analysis.soft_skills?.match_rate && analysis.soft_skills.match_rate < 40) {
    plan.push('🟡 Highlight soft skills in your summary and bullet points');
  }
  
  // Info items
  if (analysis.hard_skills?.missing?.length) {
    plan.push('ℹ️ Consider adding: ' + analysis.hard_skills.missing.slice(0, 5).join(', '));
  }
  
  if (!plan.length) {
    plan.push('✅ Your resume looks great! Consider customizing for specific job applications.');
  }
  
  return plan;
}

// Optional: Try to use Ollama for advanced suggestions
export async function getOllamaSuggestions(
  resumeText: string,
  jd: string
): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: `You are a resume expert. Analyze this resume against the job description and provide specific improvement suggestions. 
        
Resume:
${resumeText}

Job Description:
${jd}

Provide 5 specific, actionable improvements in bullet point format.`,
        stream: false,
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response || null;
  } catch {
    return null;
  }
}
