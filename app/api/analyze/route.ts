// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyze, type AnalyzeInput, type AnalyzeOutput, type DocHints } from "@/lib/analyze";
import { paperweightExtract } from "@/lib/paperweight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ helpers ------------------------------ */

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

type TextWithHints = { text: string; hints?: DocHints };

// Toggle where/when Paperweight runs.
// - query param:   ?extractor=auto|paperweight|plain
// - header:        x-extractor: auto|paperweight|plain
// - env var:       EXTRACTOR_MODE=auto|paperweight|plain
type ExtractorMode = "auto" | "paperweight" | "plain";
function getExtractorMode(req: NextRequest): ExtractorMode {
  const qp  = req.nextUrl.searchParams.get("extractor")?.toLowerCase();
  const hdr = req.headers.get("x-extractor")?.toLowerCase();
  const env = process.env.EXTRACTOR_MODE?.toLowerCase();
  const mode = (qp || hdr || env || "auto") as ExtractorMode;
  return mode === "paperweight" || mode === "plain" ? mode : "auto";
}

async function readUpload(val: any, mode: ExtractorMode): Promise<TextWithHints> {
  if (!val) return { text: "" };
  if (typeof val === "string") return { text: val };

  const name: string | undefined = val?.name;
  const type: string | undefined = val?.type;
  const isPdf =
    (type && type.includes("application/pdf")) ||
    (name && name.toLowerCase().endsWith(".pdf"));

  if (typeof val.arrayBuffer === "function") {
    const ab: ArrayBuffer = await val.arrayBuffer();
    const byteLen = ab?.byteLength ?? 0;

    if (isPdf && byteLen > 0) {
      if (mode === "plain") {
        // Force simple UTF-8 decode (no Paperweight) for A/B testing or debugging.
        return { text: new TextDecoder().decode(ab) };
      }
      // auto or paperweight -> deep PDF extraction + signals
      const doc = await paperweightExtract(ab);
      return { text: doc.text, hints: doc.hints };
    }

    return { text: byteLen > 0 ? new TextDecoder().decode(ab) : "" };
  }

  if (typeof val.text === "function") {
    const t = await val.text();
    return { text: t };
  }

  return { text: "" };
}

async function readForm(req: NextRequest, mode: ExtractorMode) {
  const form = await req.formData();

  const resumeTextField = (form.get("resume_text") as string) || "";
  const jdTextField     = (form.get("jd_text") as string) || "";

  const resumeVal = form.get("resume");
  const jdVal     = form.get("jd");

  let resumeText = "";
  let jd = "";
  let resumeHints: DocHints | undefined;
  let jdHints: DocHints | undefined;

  if (resumeTextField) {
    resumeText = resumeTextField;
  } else {
    const r = await readUpload(resumeVal, mode);
    resumeText = r.text || "";
    resumeHints = r.hints;
  }

  if (jdTextField) {
    jd = jdTextField;
  } else {
    const j = await readUpload(jdVal, mode);
    jd = j.text || "";
    jdHints = j.hints;
  }

  const weightsRaw = (form.get("weights") as string) || "";
  const redactPII = String(form.get("redact_pii") ?? "false").toLowerCase() === "true";

  let weights: AnalyzeInput["weights"] | undefined = undefined;
  if (weightsRaw) { try { weights = JSON.parse(weightsRaw); } catch {} }

  return { resumeText, jd, weights, redactPII, resumeHints, jdHints };
}

async function readJson(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const resumeText: string = body?.resumeText ?? body?.resume ?? "";
  const jd: string         = body?.jd ?? body?.jobDescription ?? "";
  const weights: AnalyzeInput["weights"] | undefined = body?.weights;
  const redactPII: boolean = Boolean(body?.redactPII ?? body?.redact_pii ?? false);
  return {
    resumeText,
    jd,
    weights,
    redactPII,
    resumeHints: undefined as DocHints | undefined,
    jdHints: undefined as DocHints | undefined,
  };
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
    const mode = getExtractorMode(req); // <-- toggles Paperweight vs plain decode
    const ct = req.headers.get("content-type") ?? "";

    let resumeText = "", jd = "";
    let weights: AnalyzeInput["weights"] | undefined;
    let redactPII = false;
    let resumeHints: DocHints | undefined;
    let jdHints: DocHints | undefined;

    if (ct.includes("multipart/form-data")) {
      ({ resumeText, jd, weights, redactPII, resumeHints, jdHints } = await readForm(req, mode));
    } else if (ct.includes("application/json")) {
      ({ resumeText, jd, weights, redactPII, resumeHints, jdHints } = await readJson(req));
    } else if (ct.includes("text/plain")) {
      const text = await req.text();
      const [resPart, jdPart] = text.split(/\n---+\n/);
      resumeText = resPart?.trim() || "";
      jd = jdPart?.trim() || "";
    } else {
      // best-effort fallback
      try { ({ resumeText, jd, weights, redactPII, resumeHints, jdHints } = await readForm(req, mode)); }
      catch { ({ resumeText, jd, weights, redactPII, resumeHints, jdHints } = await readJson(req)); }
    }

    // Optional single-field smoke test
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

    const input: AnalyzeInput = {
      resumeText,
      jd,
      weights: mergedWeights,
      redactPII,
      hints: { resume: resumeHints, jd: jdHints },
    };

    const out = analyze(input) as AnalyzeOutput & { debug?: any };
    // Non-breaking debug info (UI can ignore)
    out.debug = {
      extractor_mode: mode,
      resume_method: resumeHints?.method,
      jd_method: jdHints?.method,
    };

    return NextResponse.json(out);
  } catch (err: any) {
    console.error("Fatal error in /api/analyze", err);
    return json(500, { error: "Internal error in /api/analyze", detail: String(err?.message || err) });
  }
}
