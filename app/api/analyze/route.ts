// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";
import { parseFromFile } from "@/lib/parseResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function j(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  try {
    let jd = "";
    let resumeText = "";
    let file: File | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      jd = String(form.get("jd") ?? "");
      resumeText = String(form.get("resume_text") ?? "");
      file = (form.get("resume") as unknown as File) || null;
    } else {
      const text = await req.text();
      try {
        const json = text ? JSON.parse(text) : {};
        jd = String(json.jd ?? "");
        resumeText = String(json.resume_text ?? "");
      } catch {
        const params = new URLSearchParams(text);
        jd = String(params.get("jd") ?? "");
        resumeText = String(params.get("resume_text") ?? "");
      }
    }

    if (file) {
      try {
        const parsed = await parseFromFile(file);
        if ((parsed.text ?? "").trim()) resumeText = parsed.text;
      } catch (e) {
        // swallow; still try with provided text
        console.error("parseFromFile failed:", e);
      }
    }

    if (!jd || !resumeText) {
      return j(400, { error: "Provide both resume and JD (text or file)." });
    }

    const out = analyze({ resumeText, jd });
    return j(200, out);
  } catch (e: any) {
    console.error("[/api/analyze fatal]", e?.stack || e);
    return j(500, { error: "Internal error in /api/analyze", detail: String(e?.message || e) });
  }
}
