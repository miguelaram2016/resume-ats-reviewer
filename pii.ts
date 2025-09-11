// Simple first-pass PII redaction; toggle-able in UI
export function redactPII(text: string): string {
  if (!text) return text;
  const rules: [RegExp, string][] = [
    [/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]'],
    [/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]'],
    [/(https?:\/\/)?(www\.)?[\w-]+\.[\w.-]+\/?[\w\-.?=&%]*/gi, '[REDACTED_URL]'],
    [/\b\d{1,5}\s+[A-Za-z0-9'.\-\s]+\s+(?:Ave|Avenue|Blvd|Boulevard|Rd|Road|St|Street|Ln|Lane|Dr|Drive|Ct|Court)\b\.*/gi, '[REDACTED_ADDRESS]'],
    [/LinkedIn:\s*[^\n]+/gi, 'LinkedIn: [REDACTED]'],
    [/GitHub:\s*[^\n]+/gi, 'GitHub: [REDACTED]'],
  ];
  let out = text;
  for (const [re, repl] of rules) out = out.replace(re, repl);
  return out;
}