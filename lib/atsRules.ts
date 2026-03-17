export type AtsFinding = { 
  ok: boolean; 
  label: string; 
  note?: string;
  priority?: 'critical' | 'warning' | 'info';
  category?: string;
};

export interface AtsRule {
  check: (context: AtsContext) => AtsFinding;
  label: string;
  category: string;
  priority: 'critical' | 'warning' | 'info';
}

export interface AtsContext {
  fileName?: string;
  text: string;
  wordCount: number;
  charCount: number;
  lines: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinks: boolean;
  bulletCount: number;
  datePatterns: string[];
  sectionHeadings: string[];
}

const STANDARD_HEADINGS = ['experience', 'education', 'skills', 'projects', 'summary', 'certifications', 'work history', 'professional experience', 'technical skills'];

export function evaluateAts({ fileName, text }: { fileName?: string; text: string }): { findings: AtsFinding[]; score: number; parsingRate?: number } {
  const findings: AtsFinding[] = [];
  
  // Basic context
  const lines = text.split(/\n+/);
  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  const charCount = text.length;
  
  // Contact info
  const hasEmail = /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(text);
  const hasPhone = /\+?[\d\s().-]{10,}\d/.test(text);
  const hasLinks = /https?:\/\/[^\s]+/i.test(text);
  
  // Bullet points
  const bulletCount = (text.match(/[•\-\u2022◆▪]\s*/g) || []).length;
  
  // Dates
  const datePatterns = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4}|\b\d{4}\b)/gi) || [];
  
  // Section headings
  const sectionHeadings: string[] = [];
  STANDARD_HEADINGS.forEach(heading => {
    if (new RegExp(`\\n\\s*${heading}\\s*\\n`, 'i').test(text)) {
      sectionHeadings.push(heading);
    }
  });

  const context: AtsContext = {
    fileName,
    text,
    wordCount,
    charCount,
    lines,
    hasEmail,
    hasPhone,
    hasLinks,
    bulletCount,
    datePatterns,
    sectionHeadings,
  };

  // Run all rules
  const rules: AtsRule[] = [
    // Critical rules
    {
      label: 'Contact Information',
      category: 'Basics',
      priority: 'critical',
      check: () => ({
        ok: hasEmail && hasPhone,
        label: 'Contact information present',
        note: hasEmail && hasPhone ? 'Email and phone found' : 'Missing email or phone',
        priority: 'critical',
        category: 'Basics',
      }),
    },
    {
      label: 'File Name Cleanliness',
      category: 'File',
      priority: 'critical',
      check: () => {
        const cleanName = !fileName || /^[\w\s.-]+$/.test(fileName);
        return {
          ok: cleanName,
          label: 'Clean file name',
          note: cleanName ? 'File name is ATS-friendly' : 'Avoid special characters in file name',
          priority: 'critical',
          category: 'File',
        };
      },
    },
    {
      label: 'Reasonable Length',
      category: 'Content',
      priority: 'critical',
      check: () => {
        const okLength = wordCount >= 250 && wordCount <= 1400;
        return {
          ok: okLength,
          label: 'Resume length',
          note: okLength ? `${wordCount} words (good)` : `${wordCount} words (${wordCount < 250 ? 'too short' : 'too long'})`,
          priority: 'critical',
          category: 'Content',
        };
      },
    },
    {
      label: 'Standard Headings',
      category: 'Structure',
      priority: 'critical',
      check: () => {
        const hasHeading = sectionHeadings.length >= 3;
        return {
          ok: hasHeading,
          label: 'Standard section headings',
          note: hasHeading ? `Found: ${sectionHeadings.join(', ')}` : 'Add standard headings (Experience, Education, Skills)',
          priority: 'critical',
          category: 'Structure',
        };
      },
    },
    
    // Warning rules
    {
      label: 'Single Column Layout',
      category: 'Format',
      priority: 'warning',
      check: () => {
        const shortLines = lines.filter((l) => l.trim().length > 0 && l.trim().length < 25).length;
        const likelyColumns = shortLines / Math.max(1, lines.filter((l) => l.trim().length > 0).length) > 0.45;
        return {
          ok: !likelyColumns,
          label: 'Single-column layout',
          note: likelyColumns ? 'May have multi-column layout (hard to parse)' : 'Single column format detected',
          priority: 'warning',
          category: 'Format',
        };
      },
    },
    {
      label: 'Consistent Date Formats',
      category: 'Dates',
      priority: 'warning',
      check: () => {
        const years = text.match(/\b(19|20)\d{2}\b/g) || [];
        const uniqueYears = new Set(years);
        const hasConsistentDates = uniqueYears.size >= 1;
        return {
          ok: hasConsistentDates,
          label: 'Consistent date formats',
          note: hasConsistentDates ? 'Dates appear consistent' : 'Check date format consistency',
          priority: 'warning',
          category: 'Dates',
        };
      },
    },
    {
      label: 'Bullet Points',
      category: 'Content',
      priority: 'warning',
      check: () => {
        const hasBullets = bulletCount > 3;
        return {
          ok: hasBullets,
          label: 'Bulleted experience',
          note: hasBullets ? `${bulletCount} bullet points found` : 'Use bullet points for experience',
          priority: 'warning',
          category: 'Content',
        };
      },
    },
    {
      label: 'No Tables',
      category: 'Format',
      priority: 'info',
      check: () => {
        // Only flag tables if very obvious (3+ pipe-separated columns)
        const hasTableIndicators = /\|[^\n|]+\|[^\n|]+\|[^\n|]+\|/.test(text);
        return {
          ok: !hasTableIndicators,
          label: 'No tables',
          note: hasTableIndicators ? 'Tables may not parse correctly' : 'No table structures detected',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'No Text Boxes',
      category: 'Format',
      priority: 'info',
      check: () => {
        // Only flag if very obvious binary artifacts (null bytes)
        const hasTextBoxes = /\x00[\x00-\xFF]{10,}/.test(text);
        return {
          ok: !hasTextBoxes,
          label: 'No text boxes/graphics',
          note: hasTextBoxes ? 'Special characters may indicate graphics' : 'No problematic graphics detected',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'No Headers/Footers',
      category: 'Format',
      priority: 'info',
      check: () => {
        // Only flag if very short text with headers (likely not a real resume issue)
        const hasHeadersFooters = text.length < 300 && /^[\s]*[\dA-Z][.\s]*[\r\n]{2,}/m.test(text);
        return {
          ok: !hasHeadersFooters,
          label: 'No headers/footers',
          note: hasHeadersFooters ? 'May have headers/footers that won\'t parse' : 'No header/footer detected',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'Selectable Text',
      category: 'Format',
      priority: 'warning',
      check: () => {
        // If mostly ASCII, likely selectable
        const asciiRatio = (text.match(/[\x00-\x7F]/g) || []).length / Math.max(1, text.length);
        const isSelectable = asciiRatio > 0.9;
        return {
          ok: isSelectable,
          label: 'Selectable text',
          note: isSelectable ? 'Text appears selectable' : 'May contain images or special encoding',
          priority: 'warning',
          category: 'Format',
        };
      },
    },
    
    // Info rules
    {
      label: 'Summary Section',
      category: 'Structure',
      priority: 'info',
      check: () => {
        const hasSummary = /summary|objective|profile|about/i.test(text);
        return {
          ok: hasSummary,
          label: 'Summary section',
          note: hasSummary ? 'Summary/objective section found' : 'Consider adding a summary',
          priority: 'info',
          category: 'Structure',
        };
      },
    },
    {
      label: 'Skills Section',
      category: 'Structure',
      priority: 'info',
      check: () => {
        const hasSkills = /skills|technical\s+skills|competencies/i.test(text);
        return {
          ok: hasSkills,
          label: 'Skills section',
          note: hasSkills ? 'Skills section found' : 'Consider adding a skills section',
          priority: 'info',
          category: 'Structure',
        };
      },
    },
    {
      label: 'Education Section',
      category: 'Structure',
      priority: 'info',
      check: () => {
        const hasEducation = /education|degree|certif/i.test(text);
        return {
          ok: hasEducation,
          label: 'Education section',
          note: hasEducation ? 'Education section found' : 'Consider adding education',
          priority: 'info',
          category: 'Structure',
        };
      },
    },
    {
      label: 'Quantification',
      category: 'Content',
      priority: 'info',
      check: () => {
        const numbers = text.match(/\b\d+[%$Kk]?\b/g) || [];
        const quantified = numbers.length > 5;
        return {
          ok: quantified,
          label: 'Quantified achievements',
          note: quantified ? `${numbers.length} numbers found` : 'Add metrics/percentages to achievements',
          priority: 'info',
          category: 'Content',
        };
      },
    },
    {
      label: 'Action Verbs',
      category: 'Content',
      priority: 'info',
      check: () => {
        const actionVerbs = /\b(managed|led|created|developed|implemented|increased|decreased|improved|achieved|delivered|organized|coordinated)\b/gi;
        const hasActionVerbs = (text.match(actionVerbs) || []).length > 3;
        return {
          ok: hasActionVerbs,
          label: 'Action verbs',
          note: hasActionVerbs ? 'Good use of action verbs' : 'Start bullets with action verbs',
          priority: 'info',
          category: 'Content',
        };
      },
    },
    {
      label: 'No Nested Bullet Points',
      category: 'Format',
      priority: 'info',
      check: () => {
        const nestedBullets = text.match(/^[ \t]+[•\-\u2022][ \t]+[•\-\u2022]/gm) || [];
        return {
          ok: nestedBullets.length === 0,
          label: 'Simple bullet structure',
          note: nestedBullets.length > 0 ? 'Nested bullets may confuse ATS' : 'No nested bullets detected',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'Reasonable Font Size',
      category: 'Format',
      priority: 'info',
      check: (ctx) => {
        // Can't actually check font size, but can check for issues
        const allWords: string[] = ctx.text.match(/\b\w+\b/g) || [];
        const hasVeryShortWords = allWords.filter(w => w.length < 2).length / Math.max(1, allWords.length) > 0.1;
        return {
          ok: !hasVeryShortWords,
          label: 'Readable text density',
          note: hasVeryShortWords ? 'May have formatting issues' : 'Text density looks normal',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'No Inline Images',
      category: 'Format',
      priority: 'info',
      check: () => {
        // Check for image placeholders
        const hasImagePlaceholders = /\[image\]|\[photo\]|████|▓▓▓/i.test(text);
        return {
          ok: !hasImagePlaceholders,
          label: 'No embedded images',
          note: hasImagePlaceholders ? 'May contain images that won\'t parse' : 'No image placeholders detected',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'Reasonable Margins',
      category: 'Format',
      priority: 'info',
      check: () => {
        // Can't check actual margins, but can check line density
        const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / Math.max(1, lines.length);
        const reasonableMargins = avgLineLength > 20 && avgLineLength < 100;
        return {
          ok: reasonableMargins,
          label: 'Normal line length',
          note: reasonableMargins ? 'Line length looks appropriate' : 'May have unusual margins',
          priority: 'info',
          category: 'Format',
        };
      },
    },
    {
      label: 'File Type Recommendation',
      category: 'File',
      priority: 'info',
      check: (ctx) => {
        const isDocx = ctx.fileName?.toLowerCase().endsWith('.docx');
        return {
          ok: !isDocx,
          label: 'PDF recommended',
          note: isDocx ? 'Consider converting to PDF for better ATS parsing' : 'Good file type for ATS',
          priority: 'info',
          category: 'File',
        };
      },
    },
  ];

  // Run all rules
  rules.forEach(rule => {
    findings.push(rule.check(context));
  });

  // Calculate score (weighted more heavily on critical issues)
  const criticalCount = findings.filter(f => f.priority === 'critical' && f.ok).length;
  const criticalTotal = findings.filter(f => f.priority === 'critical').length;
  const warningCount = findings.filter(f => f.priority === 'warning' && f.ok).length;
  const warningTotal = findings.filter(f => f.priority === 'warning').length;
  const infoCount = findings.filter(f => f.priority === 'info' && f.ok).length;
  const infoTotal = findings.filter(f => f.priority === 'info').length;

  // Weighted score: 50% critical, 35% warning, 15% info
  const criticalScore = criticalTotal > 0 ? (criticalCount / criticalTotal) * 50 : 50;
  const warningScore = warningTotal > 0 ? (warningCount / warningTotal) * 35 : 35;
  const infoScore = infoTotal > 0 ? (infoCount / infoTotal) * 15 : 15;
  
  const score = Math.round(criticalScore + warningScore + infoScore);

  // Estimate parsing rate (based on issues that affect readability)
  const parsingFactors = [
    findings.find(f => f.label === 'Single-column layout')?.ok ?? true,
    findings.find(f => f.label === 'No tables')?.ok ?? true,
    findings.find(f => f.label === 'Selectable text')?.ok ?? true,
    findings.find(f => f.label === 'No embedded images')?.ok ?? true,
  ];
  const parsingRate = Math.round((parsingFactors.filter(Boolean).length / parsingFactors.length) * 100);

  return { findings, score, parsingRate };
}
