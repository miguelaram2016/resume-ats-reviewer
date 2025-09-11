import MarkdownIt from 'markdown-it';
import PDFDocument from 'pdfkit';

export function buildMarkdown(payload: any) {
  const md = [
    `# Resume & ATS Reviewer Results`,
    ``,
    `**Overall:** ${payload?.scores?.overall ?? 0}%`,
    `- ATS: ${payload?.scores?.ats ?? 0}%`,
    `- Keywords: ${payload?.scores?.keyword_match ?? 0}%`,
    `- Impact: ${payload?.scores?.impact ?? 0}%`,
    `- Clarity: ${payload?.scores?.clarity ?? 0}%`,
    ``,
    `## Flags`,
    ...(payload?.flags || []).map((x: string) => `- ${x}`),
    ``,
    `## Fix List`,
    ...(payload?.fix_list || []).map((x: string) => `- ${x}`),
    ``,
    `## Missing Keywords`,
    ...(payload?.missing_keywords || []).map((x: string) => `- ${x}`),
    ``,
    `## Suggested Bullet Rewrites`,
    ...(payload?.suggested_rewrites || []).map((x: string) => `- ${x}`),
    ``,
    `## Tailored Summary`,
    payload?.tailored_summary ? payload.tailored_summary : '',
  ].join('\n');
  return md;
}

export async function buildPdfFromMarkdown(mdText: string): Promise<Buffer> {
  // Simple text PDF using PDFKit for portability
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const md = new MarkdownIt();
  const html = md.render(mdText);
  // Strip HTML tags and extra whitespace
  const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  doc.fontSize(18).text('Resume & ATS Reviewer Results', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(text, { align: 'left' });
  doc.end();
  return await new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
