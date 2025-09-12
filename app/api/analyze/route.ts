// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";
import { parseFromFile } from "@/lib/parseResume";
import { logger, newReqId } from "@/lib/logger";

export const runtime = "nodejs";

function withTimeout<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${tag} timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function POST(req: NextRequest) {
  const id = newReqId();
  const t0 = Date.now();
  logger.info("analyze:start", { id });

  try {
    const form = await withTimeout(req.formData(), 10_000, "formData");
    let jd = (form.get("jd") as string) || "";
    let resumeText = (form.get("resume_text") as string) || "";
    const file = form.get("resume") as unknown as File | null;

    logger.info("analyze:inputs", { id, hasFile: !!file, jdLen: jd.length, resumeTextLen: resumeText.length });

    if (file) {
      // TEMP: comment next 2 lines in to **bypass file parsing** while we debug
      // logger.warn("analyze: bypassing file parse temporarily", { id, fileName: (file as any)?.name });
      // jd ||= "general role responsibilities"; // optional helper if jd was empty

      const parsed = await withTimeout(parseFromFile(file), 20_000, "parseFromFile");
      resumeText = parsed.text || resumeText;
      logger.info("analyze:parsed", { id, fileName: parsed.fileName, textLen: resumeText.length });
    }

    if (!resumeText && !jd) {
      return NextResponse.json({ error: "Provide a resume (file or text)." }, { status: 400 });
    }
    if (!jd) {
      // keep analysis stable if jd is blank
      jd = "general software role responsibilities skills experience";
    }

    // read PII toggle from either name; default on
    const redactPII = String(form.get("pii") ?? form.get("redact_pii") ?? "true") === "true";

    const out = analyze({ resumeText, jd, redactPII });
    logger.info("analyze:done", { id, totalMs: Date.now() - t0, scores: out?.scores });

    return NextResponse.json(out);
  } catch (e: any) {
    logger.error("analyze:error", { id, message: e?.message, stack: e?.stack });
    return NextResponse.json({ error: e?.message || "Unexpected error", id }, { status: 500 });
  }
}
