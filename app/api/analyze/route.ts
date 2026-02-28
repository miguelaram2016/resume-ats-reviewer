// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyzer";
import { parseResume } from "@/lib/parseResume";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let resumeText = "";
    let jd = "";

    // Handle JSON
    if (contentType.includes("application/json")) {
      const body = await req.json();
      resumeText = body?.resume || body?.resumeText || "";
      jd = body?.jd || body?.jobDescription || "";
    }
    // Handle multipart/form-data (file upload)
    else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const resumeFile = form.get("resume") as File | null;
      const jdText = form.get("jd") as string || "";
      
      // Parse resume from file
      if (resumeFile && resumeFile.size > 0) {
        const parsed = await parseResume(resumeFile);
        resumeText = parsed.text;
      }
      jd = jdText;
    }
    // Handle plain text
    else {
      const text = await req.text();
      const parts = text.split(/\n---+|\n--\n/);
      resumeText = parts[0]?.trim() || "";
      jd = parts[1]?.trim() || "";
    }

    if (!resumeText || !jd) {
      return NextResponse.json({ error: "Provide resume and jd" }, { status: 400 });
    }

    const result = analyze({ resumeText, jd });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
