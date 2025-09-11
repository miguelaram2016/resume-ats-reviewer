export type AtsFinding = { ok: boolean; label: string; note?: string };

export function evaluateAts({ fileName, text }: { fileName?: string; text: string }): { findings: AtsFinding[]; score: number } {
  const findings: AtsFinding[] = [];
  const cleanName = !fileName || /^[\w.-]+$/.test(fileName);
  findings.push({ ok: !!cleanName, label: 'File name cleanliness' });
  const stdHeadings = ['experience', 'education', 'skills', 'projects', 'summary', 'certifications'];
  const hasHeading = stdHeadings.some((h) => new RegExp(`\n\s*${h}\s*\n`, 'i').test(text));
  findings.push({ ok: hasHeading, label: 'Standard headings present' });
  const lines = text.split(/\n+/);
  const shortLines = lines.filter((l) => l.length > 0 && l.length < 25).length;
  const likelyColumns = shortLines / Math.max(1, lines.length) > 0.45;
  findings.push({ ok: !likelyColumns, label: 'Single-column layout' });
  const dateLike = text.match(/\b(\d{4})\b/g) || [];
  const consistentDates = new Set(dateLike).size >= Math.min(1, dateLike.length);
  findings.push({ ok: consistentDates, label: 'Consistent date formats' });
  const bullets = (text.match(/[•\-\u2022]/g) || []).length;
  findings.push({ ok: bullets > 3, label: 'Bulleted experience' });
  const hasEmail = /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(text);
  const hasPhone = /\+?\d[\d\s().-]{7,}\d/.test(text);
  findings.push({ ok: hasEmail && hasPhone, label: 'Selectable contact info' });
  const words = (text.match(/\b\w+\b/g) || []).length;
  const okLength = words >= 250 && words <= 1400;
  findings.push({ ok: okLength, label: 'Reasonable length' });
  const score = Math.round((findings.filter((f) => f.ok).length / findings.length) * 100);
  return { findings, score };
}
