// lib/parseResume.ts
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

/**
 * Accepts a web File from the Next.js route (FormData) and returns extracted text + original name.
 * Handles PDF, DOCX, and plain text.
 */
export async function parseFromFile(file: File): Promise<{ text: string; fileName: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const name = file.name || "resume";
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const out = await pdfParse(buf);
    return { text: out.text || "", fileName: name };
  }

  if (lower.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return { text: out.value || "", fileName: name };
  }

  // Fallback: treat as utf-8 text
  return { text: buf.toString("utf8"), fileName: name };
}
