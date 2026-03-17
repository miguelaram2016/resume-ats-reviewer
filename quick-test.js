const { analyzeStandalone } = require('./lib/standaloneAnalysis');

const resumeText = `Miguel Ramirez
Email: miguel@example.com
Phone: (555) 123-4567

PROFESSIONAL SUMMARY
Test

WORK EXPERIENCE
Test

EDUCATION
Test

SKILLS
Test`;

const result = analyzeStandalone(resumeText);
console.log('=== DETECTED SECTIONS ===');
console.log(JSON.stringify(result.detected_sections, null, 2));
console.log('\n=== MISSING SECTIONS ===');
console.log(result.missing_sections);
console.log('\n=== STRUCTURE SCORE ===');
console.log(result.structure_score);
console.log('\n=== ATS FRIENDLY ===');
console.log(JSON.stringify(result.ats_friendly, null, 2));
