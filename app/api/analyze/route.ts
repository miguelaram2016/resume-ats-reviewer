// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeInput, AnalyzeOutput } from "@/lib/analyze";
import { analyze } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ utils ------------------------------ */

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

/** Pure Node PDF text extraction (no workers/canvas). */
async function extractPdfText(ab: ArrayBuffer | Uint8Array): Promise<string> {
  const data = ab instanceof Uint8Array ? ab : new Uint8Array(ab);

  try {
    // Load pdf-parse at runtime so Next never bundles it (avoids ENOENT/test fixture issues)
    // eslint-disable-next-line no-eval
    const req: NodeRequire = eval("require");
    const pdfParseMod = req("pdf-parse");
    const pdfParse = (pdfParseMod as any).default ?? pdfParseMod;
    const out = await pdfParse(Buffer.from(data));
    const text = typeof out?.text === "string" ? out.text : "";
    if (text) return text;
  } catch (err) {
    // Quietly fall through to UTF-8 decode; no noisy warnings during dev
  }

  // Last resort: naive UTF-8 decode
  return new TextDecoder().decode(data);
}

/** Read File|string|null -> UTF-8 text; parse PDFs when appropriate */
async function fileToTextSmart(v: unknown): Promise<{ text: string; name?: string; type?: string }> {
  if (!v) return { text: "" };
  if (typeof v === "string") return { text: v };

  // @ts-ignore - Next's File polyfill
  const name: string | undefined = v?.name;
  // @ts-ignore
  const type: string | undefined = v?.type;
  const looksPdf = (type && type.includes("application/pdf")) || (name && name.toLowerCase().endsWith(".pdf"));

  // Prefer arrayBuffer (works with Next File polyfill)
  // @ts-ignore
  if (typeof v.arrayBuffer === "function") {
    // @ts-ignore
    const ab: ArrayBuffer = await v.arrayBuffer();
    const byteLen = ab?.byteLength ?? 0;

    if (looksPdf && byteLen > 0) {
      const text = await extractPdfText(ab);
      return { text, name, type };
    }

    const decoded = byteLen > 0 ? new TextDecoder().decode(ab) : "";
    return { text: decoded, name, type };
  }

  // Fallback to .text()
  // @ts-ignore
  if (typeof v.text === "function") {
    // @ts-ignore
    const t: string = await v.text();
    return { text: t, name, type };
  }

  return { text: "", name, type };
}

async function readForm(req: NextRequest) {
  const form = await req.formData();

  const resumeTextField = (form.get("resume_text") as string) || "";
  const jdTextField = (form.get("jd_text") as string) || "";

  const resumeVal = form.get("resume");
  const jdVal = form.get("jd");

  const { text: resumeAuto } = await fileToTextSmart(resumeVal);
  const { text: jdAuto } = await fileToTextSmart(jdVal);

  const resumeText = resumeTextField || resumeAuto || "";
  const jd = jdTextField || jdAuto || "";

  const weightsRaw = (form.get("weights") as string) || "";
  const redactPII = String((form.get("redact_pii") ?? "false")).toLowerCase() === "true";

  let weights: AnalyzeInput["weights"] | undefined;
  if (weightsRaw) { try { weights = JSON.parse(weightsRaw); } catch {} }

  return { resumeText, jd, weights, redactPII };
}

async function readJson(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const resumeText: string = body?.resumeText ?? body?.resume ?? "";
  const jd: string = body?.jd ?? body?.jobDescription ?? "";
  const weights: AnalyzeInput["weights"] | undefined = body?.weights;
  const redactPII: boolean = Boolean(body?.redactPII ?? body?.redact_pii ?? false);
  return { resumeText, jd, weights, redactPII };
}

/* ------------------------------ handlers ------------------------------ */

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") ?? "";
    let resumeText = "", jd = "";
    let weights: AnalyzeInput["weights"] | undefined;
    let redactPII = false;

    if (ct.includes("multipart/form-data")) {
      ({ resumeText, jd, weights, redactPII } = await readForm(req));
    } else if (ct.includes("application/json")) {
      ({ resumeText, jd, weights, redactPII } = await readJson(req));
    } else if (ct.includes("text/plain")) {
      const text = await req.text();
      const [resPart, jdPart] = text.split(/\n---+\n/);
      resumeText = resPart?.trim() || "";
      jd = jdPart?.trim() || "";
    } else {
      try { ({ resumeText, jd, weights, redactPII } = await readForm(req)); }
      catch { ({ resumeText, jd, weights, redactPII } = await readJson(req)); }
    }

    // Optional single-field smoke test: { text }
    if (!resumeText && !jd) {
      try {
        const b = await req.json();
        if (typeof b?.text === "string" && b.text.trim()) {
          resumeText = b.text;
          jd = b.text;
        }
      } catch {}
    }

    if (!resumeText || !jd) {
      return json(400, { error: "Provide both resume and JD (text or file)." });
    }

    const mergedWeights: Required<AnalyzeInput["weights"]> = {
      ats:           weights?.ats ?? 0.3,
      keyword_match: weights?.keyword_match ?? 0.35,
      impact:        weights?.impact ?? 0.2,
      clarity:       weights?.clarity ?? 0.15,
    };

    const input: AnalyzeInput = { resumeText, jd, weights: mergedWeights, redactPII };
    const out: AnalyzeOutput = analyze(input);
    return json(200, out);
  } catch (err: any) {
    console.error("Fatal error in /api/analyze", err);
    return json(500, { error: "Internal error in /api/analyze", detail: String(err?.message || err) });
  }
}
