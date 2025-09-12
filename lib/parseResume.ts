import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { logger } from "./logger";

type PdfParseResult = { text?: string; /* other fields ignored */ };
type MammothResult = { value?: string };

function withTimeout<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${tag} timeout after ${ms}ms`)), ms);
    p.then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); }
    );
  });
}

export async function parseFromFile(file: File): Promise<{ text: string; fileName: string }> {
  const fileName = file.name || "resume";
  const lower = fileName.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  logger.info("parse:start", { fileName, size: buf.length });

  try {
    if (lower.endsWith(".pdf")) {
      const out = await withTimeout<PdfParseResult>(pdfParse(buf) as Promise<PdfParseResult>, 15_000, "pdf-parse");
      return { text: out.text || "", fileName };
    }
    if (lower.endsWith(".docx")) {
      const out = await withTimeout<MammothResult>(mammoth.extractRawText({ buffer: buf }) as Promise<MammothResult>, 15_000, "mammoth");
      return { text: out.value || "", fileName };
    }
    // Fallback: treat as text
    return { text: buf.toString("utf8"), fileName };
  } catch (e: any) {
    logger.error("parse:error", { fileName, message: e?.message });
    // Last resort: return utf8 so the API never hangs
    return { text: buf.toString("utf8"), fileName };
  }
}
