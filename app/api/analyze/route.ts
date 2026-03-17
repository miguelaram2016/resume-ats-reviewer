// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyzer";
import { parseResume, extractHints } from "@/lib/parseResume";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let resumeText = "";
    let jd = "";
    let fileInfo: { fileName?: string; fileSize?: number; fileType?: string } = {};
    let weights: any = undefined;
    let redactPII = false;

    // Handle JSON
    if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        resumeText = body?.resume || body?.resumeText || "";
        jd = body?.jd || body?.jobDescription || "";
        weights = body?.weights;
        redactPII = body?.redactPII ?? false;
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }
    // Handle multipart/form-data (file upload)
    else if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch (e) {
        console.error("[analyze] FormData parse error:", e);
        return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
      }
      
      const resumeFile = form.get("resume") as File | null;
      const resumeTextField = form.get("resume_text") as string || "";
      const jdText = form.get("jd") as string || "";
      const weightsStr = form.get("weights") as string;
      const redactStr = form.get("redact_pii") as string;
      
      // Parse resume from file OR use text input
      if (resumeFile && resumeFile.size > 0) {
        const parsed = await parseResume(resumeFile);
        fileInfo = parsed.fileInfo || {};
        
        // If PDF parsing failed but user also provided text, use the text instead
        if (parsed.parsingFailed && resumeTextField) {
          console.log('[analyze] PDF parse failed, using pasted text instead');
          resumeText = resumeTextField;
        } else if (parsed.parsingFailed) {
          // No text provided, return error
          return NextResponse.json({ 
            error: "Could not parse PDF file. Please paste your resume text directly in the text area instead.",
            parsingFailed: true
          }, { status: 400 });
        } else {
          resumeText = parsed.text;
        }
      } else if (resumeTextField) {
        // Use text from textarea
        resumeText = resumeTextField;
      }
      jd = jdText;
      
      // Extract optional parameters
      if (weightsStr) {
        try { weights = JSON.parse(weightsStr); } catch {}
      }
      redactPII = redactStr === 'true';
    }
    // Handle plain text
    else {
      const text = await req.text();
      const parts = text.split(/\n---+|\n--\n/);
      resumeText = parts[0]?.trim() || "";
      jd = parts[1]?.trim() || "";
    }

    // Require resume text, but JD is optional (for standalone mode)
    if (!resumeText) {
      return NextResponse.json({ error: "Please provide a resume" }, { status: 400 });
    }

    // Extract hints from resume text (for flags generation)
    const hints = extractHints(resumeText);
    console.log("[analyze] resumeText length:", resumeText.length, "hints:", JSON.stringify(hints));

    const result = analyze({ resumeText, jd, fileInfo, weights, redactPII, hints: { resume: hints } });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze] Error:", err);
    return NextResponse.json({ 
      error: "Analysis failed", 
      details: String(err)
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
