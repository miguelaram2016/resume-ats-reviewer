import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseFromFile(file: File): Promise<{ text: string; fileName: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const out = await pdfParse(buf);
    return { text: out.text || '', fileName: file.name };
  }
  if (name.endsWith('.docx')) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return { text: out.value || '', fileName: file.name };
  }
  return { text: buf.toString('utf8'), fileName: file.name };
}