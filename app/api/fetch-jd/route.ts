import { NextRequest, NextResponse } from "next/server";
import { newReqId, logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const reqId = newReqId();
  try {
    const { url } = await req.json();
    if (!url) {
      logger.warn("fetch-jd: missing url", { reqId });
      return NextResponse.json({ error: "url required", reqId }, { status: 400 });
    }
    logger.info("fetch-jd: fetching", { reqId, url });

    const res = await fetch(url);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    logger.info("fetch-jd: ok", { reqId, textLen: text.length });
    return NextResponse.json({ text, reqId });
  } catch (err: unknown) {
    const e = err as Error;
    logger.error("fetch-jd: failed", { reqId, message: e?.message, stack: e?.stack });
    return NextResponse.json({ error: e?.message || "Fetch failed", reqId }, { status: 500 });
  }
}
