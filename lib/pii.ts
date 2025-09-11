// lib/pii.ts
export function redactPII(text: string): string {
  // very first-pass redaction (email/phone)
  return text
    .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]')
}
