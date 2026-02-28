// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resumeText = body?.resume || body?.resumeText || "";
    const jd = body?.jd || body?.jobDescription || "";
    if (!resumeText || !jd) return NextResponse.json({ error: "Provide resume and jd" }, { status: 400 });
    const { analyze } = await import("@/lib/analyzer");
    return NextResponse.json(analyze({ resumeText, jd }));
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
