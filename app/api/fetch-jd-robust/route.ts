import { NextRequest, NextResponse } from "next/server";
import { newReqId, logger } from "@/lib/logger";
import { fetchJobDescription, type JobDescription } from "@/lib/fetch-jd-robust";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const reqId = newReqId();
  
  try {
    const { url } = await req.json();
    
    if (!url) {
      logger.warn("fetch-jd-robust: missing url", { reqId });
      return NextResponse.json({ 
        error: "url is required", 
        reqId 
      }, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      logger.warn("fetch-jd-robust: invalid url format", { reqId, url });
      return NextResponse.json({ 
        error: "Invalid URL format. Please provide a valid HTTP/HTTPS URL.", 
        reqId 
      }, { status: 400 });
    }
    
    logger.info("fetch-jd-robust: fetching job description", { reqId, url });
    
    const result = await fetchJobDescription(url);
    
    if (result.success && result.data) {
      const jd: JobDescription = result.data;
      
      logger.info("fetch-jd-robust: success", { 
        reqId, 
        url,
        method: result.method,
        textLen: jd.rawText?.length,
        hasTitle: !!jd.title,
        hasCompany: !!jd.company,
        hasLocation: !!jd.location,
        hasSalary: !!jd.salary,
      });
      
      return NextResponse.json({
        success: true,
        rawText: jd.rawText,
        parsed: {
          title: jd.title,
          company: jd.company,
          location: jd.location,
          description: jd.description?.substring(0, 2000), // Limit for display
          requirements: jd.requirements,
          salary: jd.salary,
          source: jd.source,
        },
        method: result.method,
        attempts: result.attempts,
        reqId,
      });
    }
    
    logger.warn("fetch-jd-robust: failed", { 
      reqId, 
      url, 
      error: result.error,
      attempts: result.attempts 
    });
    
    // Provide helpful suggestions based on what failed
    const attemptedMethods = result.attempts?.map(a => a.method).join(', ') || 'none';
    let suggestion = '';
    
    if (result.error?.toLowerCase().includes('rate limit')) {
      suggestion = 'The site is rate-limiting requests. Try again in a few minutes or use a different job board URL.';
    } else if (result.error?.toLowerCase().includes('cloudflare') || result.error?.toLowerCase().includes('blocked')) {
      suggestion = 'This site has anti-bot protection. Try using a direct link from the job posting or copy-paste the description manually.';
    } else if (result.error?.toLowerCase().includes('authentication') || result.error?.toLowerCase().includes('login')) {
      suggestion = 'This URL may require login. Try opening the job in a browser and copying the description text.';
    }
    
    return NextResponse.json({
      success: false,
      error: result.error,
      attempts: result.attempts,
      attemptedMethods,
      suggestion,
      reqId,
    }, { status: 422 });
    
  } catch (err: unknown) {
    const e = err as Error;
    logger.error("fetch-jd-robust: exception", { 
      reqId, 
      message: e?.message, 
      stack: e?.stack 
    });
    
    return NextResponse.json({ 
      error: e?.message || "Internal server error", 
      reqId 
    }, { status: 500 });
  }
}

// Support GET for testing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  
  if (!url) {
    return NextResponse.json({ 
      error: "url query parameter is required",
      example: "/api/fetch-jd-robust?url=https://example.com/job"
    }, { status: 400 });
  }
  
  // Reuse POST logic
  return POST(req);
}
