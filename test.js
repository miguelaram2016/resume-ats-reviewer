const { analyze } = require('./lib/analyzer');
const { extractHints } = require('./lib/parseResume');
const resumeText = `Miguel Ramirez\nEmail: miguel@example.com\nPhone: (555) 123-4567\n\nPROFESSIONAL SUMMARY\nTest\n\nWORK EXPERIENCE\nTest\n\nEDUCATION\nTest\n\nSKILLS\nTest`;
const hints = extractHints(resumeText);
const result = analyze({ resumeText, jd: '', weights: undefined, redactPII: false, hints: { resume: hints } });
console.log('flags:', result.flags);
