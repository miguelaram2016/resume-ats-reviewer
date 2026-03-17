/**
 * Robust Job Description Fetcher
 * Tries multiple methods in order:
 * 1. Standard fetch with enhanced browser headers
 * 2. Alternative fetch (different browser signature)
 * 3. CORS proxy fallback
 * 4. Browser automation (via external service) - optional
 * 
 * Supports: Indeed, LinkedIn, Glassdoor, ZipRecruiter, Monster, and generic job pages
 */

import { newReqId, logger } from "./logger";

export interface JobDescription {
  rawText: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  source?: string;
  method?: string;
}

export interface FetchResult {
  success: boolean;
  data?: JobDescription;
  error?: string;
  method?: string;
  attempts?: {
    method: string;
    success: boolean;
    error?: string;
  }[];
}

// Environment variable for browser automation service (optional)
const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL;
const BROWSER_SERVICE_TOKEN = process.env.BROWSER_SERVICE_TOKEN;

// Detect job board from URL
function detectJobBoard(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('indeed.com')) return 'indeed';
  if (lowerUrl.includes('linkedin.com')) return 'linkedin';
  if (lowerUrl.includes('glassdoor.com')) return 'glassdoor';
  if (lowerUrl.includes('ziprecruiter.com')) return 'ziprecruiter';
  if (lowerUrl.includes('monster.com')) return 'monster';
  if (lowerUrl.includes('careerbuilder.com')) return 'careerbuilder';
  if (lowerUrl.includes('simplyhired.com')) return 'simplyhired';
  if (lowerUrl.includes('dice.com')) return 'dice';
  if (lowerUrl.includes('hired.com')) return 'hired';
  if (lowerUrl.includes('greenhouse.io')) return 'greenhouse';
  if (lowerUrl.includes('lever.co')) return 'lever';
  if (lowerUrl.includes('workday.com')) return 'workday';
  return null;
}

// Simple HTML to text extraction with better cleaning
function extractTextFromHtml(html: string): string {
  // Remove script and style tags completely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  
  // Replace block elements with newlines
  text = text
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&#x27;/g, "'")
    .replace(/&#\d+;/g, ' ');
  
  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  return text;
}

// Safe regex match helper
function safeMatch(text: string, pattern: string): string | null {
  try {
    const match = text.match(new RegExp(pattern, 'i'));
    return match ? match[1] || match[0] : null;
  } catch {
    return null;
  }
}

// Job board specific parsing helpers
function parseIndeed(text: string, html: string): Partial<JobDescription> {
  const result: Partial<JobDescription> = {};
  
  // Indeed specific patterns
  const titleMatch = html.match(/<h1[^>]*class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>([^<]+)/i)
    || text.match(/(?:job title|position)[\s:]+([^\n]{3,100})/i);
  if (titleMatch) result.title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  
  const companyMatch = text.match(/company[\s:]+([^\n]{2,80})/i)
    || html.match(/<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([^<]+)/i);
  if (companyMatch) result.company = companyMatch[1].replace(/<[^>]+>/g, '').trim();
  
  const locationMatch = text.match(/location[\s:]+([^\n]{2,80})/i)
    || html.match(/<div[^>]*class="[^"]*jobsearch-JobInfoHeader-subtitle[^"]*"[^>]*>([^<]+)/i);
  if (locationMatch) result.location = locationMatch[1].replace(/<[^>]+>/g, '').trim();
  
  // Indeed salary extraction
  const salaryMatch = html.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?\s*\/\s*(?:hour|year|month)/i);
  if (salaryMatch) {
    const parsed = parseSalary(salaryMatch[0]);
    if (parsed) result.salary = parsed;
  }
  
  return result;
}

function parseLinkedIn(text: string, html: string): Partial<JobDescription> {
  const result: Partial<JobDescription> = {};
  
  // LinkedIn specific patterns
  const titleMatch = html.match(/<h1[^>]*class="[^"]*job-title[^"]*"[^>]*>([^<]+)/i)
    || text.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) result.title = titleMatch[1].trim();
  
  const companyMatch = html.match(/<span[^>]*class="[^"]*company-name[^"]*"[^>]*>([^<]+)/i);
  if (companyMatch) result.company = companyMatch[1].trim();
  
  const locationMatch = html.match(/<span[^>]*class="[^"]*job-details[^"]*"[^>]*>([^<]+)/i);
  if (locationMatch) result.location = locationMatch[1].trim();
  
  return result;
}

function parseGlassdoor(text: string, html: string): Partial<JobDescription> {
  const result: Partial<JobDescription> = {};
  
  // Glassdoor specific patterns  
  const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/i);
  if (titleMatch) result.title = titleMatch[1].trim();
  
  const companyMatch = html.match(/<span[^>]*class="[^"]*employer-name[^"]*"[^>]*>([^<]+)/i);
  if (companyMatch) result.company = companyMatch[1].trim();
  
  const salaryMatch = html.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/i);
  if (salaryMatch) {
    const parsed = parseSalary(salaryMatch[0]);
    if (parsed) result.salary = parsed;
  }
  
  return result;
}

function parseSalary(salaryText: string): JobDescription['salary'] | undefined {
  try {
    const cleanText = salaryText.replace(/[$,\s]/g, '');
    const rangeMatch = cleanText.match(/(\d+)(?:-+to-+)?(\d+)?/);
    
    if (!rangeMatch) return undefined;
    
    const min = parseInt(rangeMatch[1]);
    const max = rangeMatch[2] ? parseInt(rangeMatch[2]) : min;
    
    const isHourly = salaryText.toLowerCase().includes('hour');
    const isMonthly = salaryText.toLowerCase().includes('month');
    
    let period = 'year';
    if (isHourly) period = 'hour';
    else if (isMonthly) period = 'month';
    
    // Convert to annual if needed
    let annualMin = min, annualMax = max;
    if (isHourly) {
      annualMin = min * 2080;
      annualMax = max * 2080;
    } else if (isMonthly) {
      annualMin = min * 12;
      annualMax = max * 12;
    }
    
    return { 
      min: annualMin, 
      max: annualMax, 
      currency: 'USD', 
      period,
    };
  } catch {
    return undefined;
  }
}

// Parse job details from text using heuristics
function parseJobDetails(text: string, url: string, html?: string): JobDescription {
  const board = detectJobBoard(url);
  
  // Start with board-specific parsing if HTML is available
  let parsed: Partial<JobDescription> = {};
  if (html) {
    if (board === 'indeed') parsed = parseIndeed(text, html);
    else if (board === 'linkedin') parsed = parseLinkedIn(text, html);
    else if (board === 'glassdoor') parsed = parseGlassdoor(text, html);
  }
  
  // Try to extract job title (fallback to generic patterns if not found)
  let title = parsed.title;
  if (!title) {
    const titleMatch = text.match(/job title[\s:]+([^\n]{3,100})/i) 
      || text.match(/position[\s:]+([^\n]{3,100})/i)
      || text.match(/role[\s:]+([^\n]{3,100})/i)
      || text.match(/^([A-Z][^\n]{3,60})$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  }

  // Try to extract company
  let company = parsed.company;
  if (!company) {
    const companyMatch = text.match(/company[\s:]+([^\n]{2,80})/i)
      || text.match(/employer[\s:]+([^\n]{2,80})/i)
      || text.match(/organization[\s:]+([^\n]{2,80})/i);
    if (companyMatch && companyMatch[1]) {
      company = companyMatch[1].trim();
    }
  }

  // Try to extract location
  let location = parsed.location;
  if (!location) {
    const remoteMatch = text.match(/(remote|hybrid|on-site|onsite|work from home|fully remote|partially remote)/i);
    if (remoteMatch) {
      location = remoteMatch[1];
    }
    const locationMatch = text.match(/location[\s:]+([^\n]{2,80})/i);
    if (locationMatch && locationMatch[1]) {
      location = locationMatch[1].trim();
    }
  }

  // Try to extract salary
  let salary = parsed.salary;
  if (!salary) {
    const salaryMatch = text.match(/\$([\d,]+)\s*(?:-|to)\s*\$([\d,]+)/i);
    if (salaryMatch && salaryMatch[1] && salaryMatch[2]) {
      const min = parseInt(salaryMatch[1].replace(/,/g, ''));
      const max = parseInt(salaryMatch[2].replace(/,/g, ''));
      const periodMatch = text.match(/(per|\/)((?:year|month|hour|yr|mo|hr|annum))/i);
      if (!isNaN(min) && !isNaN(max) && min > 0 && max > min * 0.5 && max < min * 100) {
        salary = { min, max, currency: 'USD', period: periodMatch ? periodMatch[2] : 'year' };
      }
    }
  }

  // Try to extract requirements (look for bullet points and section headers)
  const requirements: string[] = [];
  const lines = text.split('\n');
  let inRequirementsSection = false;
  
  const reqSectionHeaders = ['requirements', 'qualifications', 'what you will need', 'preferred qualifications', 'minimum requirements', 'what you need', 'what we look for'];
  
  for (const line of lines) {
    // Check if entering requirements section
    const lowerLine = line.toLowerCase();
    for (const header of reqSectionHeaders) {
      if (lowerLine.includes(header)) {
        inRequirementsSection = true;
        continue;
      }
    }
    
    // If in requirements section, look for bullets
    if (inRequirementsSection) {
      const trimmed = line.trim();
      // Check for bullet points
      if (/^[-•*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
        const clean = trimmed.replace(/^[-•*\d.)\s]+/, '').trim();
        if (clean.length > 5 && clean.length < 200) {
          requirements.push(clean);
        }
      }
      // Exit if we hit another section header
      if (requirements.length > 0 && /^[A-Z][A-Z\s]{5,50}:$/.test(trimmed)) {
        inRequirementsSection = false;
      }
    }
  }

  // Clean up description
  let description = text
    .replace(/see more/gi, '')
    .replace(/apply now/gi, '')
    .replace(/job details/gi, '')
    .substring(0, 5000);

  return {
    rawText: text,
    title,
    company,
    location,
    description,
    requirements: requirements.length > 0 ? requirements.slice(0, 15) : undefined,
    salary,
    source: board,
  };
}

// Enhanced headers that mimic a real browser
const ENHANCED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

// Rate limiting helper
function isRateLimited(status: number, text: string): boolean {
  return status === 429 || text.toLowerCase().includes('rate limit') || text.toLowerCase().includes('too many requests');
}

// Method 1: Standard fetch with enhanced headers
async function methodStandardFetch(url: string): Promise<FetchResult> {
  const reqId = newReqId();
  const attempts: FetchResult['attempts'] = [];
  
  try {
    logger.info('fetch-jd-robust: trying standard fetch', { reqId, url });
    
    const res = await fetch(url, {
      headers: ENHANCED_HEADERS,
    });
    
    if (!res.ok) {
      // Check for rate limiting
      const text = await res.text();
      if (isRateLimited(res.status, text)) {
        throw new Error('Rate limited. Please try again later.');
      }
      throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    }
    
    const html = await res.text();
    const text = extractTextFromHtml(html);
    
    if (text.length < 100) {
      throw new Error('Fetched content too short, likely blocked or empty');
    }
    
    logger.info('fetch-jd-robust: standard fetch success', { reqId, textLength: text.length });
    attempts.push({ method: 'standard_fetch', success: true });
    
    return {
      success: true,
      data: {
        ...parseJobDetails(text, url, html),
        method: 'standard_fetch',
      },
      method: 'standard_fetch',
      attempts,
    };
  } catch (error) {
    const err = error as Error;
    logger.warn('fetch-jd-robust: standard fetch failed', { reqId, error: err.message });
    attempts.push({ method: 'standard_fetch', success: false, error: err.message });
    
    return {
      success: false,
      error: err.message,
      attempts,
    };
  }
}

// Method 2: Alternative fetch with different approach
async function methodAltFetch(url: string): Promise<FetchResult> {
  const reqId = newReqId();
  const attempts: FetchResult['attempts'] = [];
  
  try {
    logger.info('fetch-jd-robust: trying alternative fetch', { reqId, url });
    
    // Try with different headers - Firefox on macOS
    const res = await fetch(url, {
      headers: {
        ...ENHANCED_HEADERS,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!res.ok) {
      // Check for rate limiting
      if (isRateLimited(res.status, '')) {
        throw new Error('Rate limited. Please try again later.');
      }
      throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    }
    
    const html = await res.text();
    const text = extractTextFromHtml(html);
    
    if (text.length < 100) {
      throw new Error('Fetched content too short');
    }
    
    attempts.push({ method: 'alt_fetch', success: true });
    
    return {
      success: true,
      data: {
        ...parseJobDetails(text, url, html),
        method: 'alt_fetch',
      },
      method: 'alt_fetch',
      attempts,
    };
  } catch (error) {
    const err = error as Error;
    logger.warn('fetch-jd-robust: alt fetch failed', { reqId, error: err.message });
    attempts.push({ method: 'alt_fetch', success: false, error: err.message });
    
    return {
      success: false,
      error: err.message,
      attempts,
    };
  }
}

// Method 3: Use a CORS proxy fallback (for blocked sites)
async function methodCORSProxy(url: string): Promise<FetchResult> {
  const reqId = newReqId();
  const attempts: FetchResult['attempts'] = [];
  
  try {
    logger.info('fetch-jd-robust: trying CORS proxy', { reqId, url });
    
    // Try using allorigins as a CORS proxy
    const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
    
    const res = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      throw new Error('CORS proxy failed: HTTP ' + res.status);
    }
    
    const json = await res.json() as { contents?: string };
    
    if (!json.contents) {
      throw new Error('No content from CORS proxy');
    }
    
    const text = extractTextFromHtml(json.contents);
    
    if (text.length < 100) {
      throw new Error('CORS proxy fetched content too short');
    }
    
    attempts.push({ method: 'cors_proxy', success: true });
    
    return {
      success: true,
      data: {
        ...parseJobDetails(text, url, json.contents),
        method: 'cors_proxy',
      },
      method: 'cors_proxy',
      attempts,
    };
  } catch (error) {
    const err = error as Error;
    logger.warn('fetch-jd-robust: CORS proxy failed', { reqId, error: err.message });
    attempts.push({ method: 'cors_proxy', success: false, error: err.message });
    
    return {
      success: false,
      error: err.message,
      attempts,
    };
  }
}

// Method 4: Browser automation via external service (e.g., browserless.io, scrapingbee)
// This is optional and requires configuration via environment variables
async function methodBrowserAutomation(url: string): Promise<FetchResult> {
  const reqId = newReqId();
  const attempts: FetchResult['attempts'] = [];
  
  // Skip if no browser service is configured
  if (!BROWSER_SERVICE_URL) {
    logger.info('fetch-jd-robust: no browser service configured, skipping', { reqId });
    return {
      success: false,
      error: 'Browser service not configured',
      attempts,
    };
  }
  
  try {
    logger.info('fetch-jd-robust: trying browser automation', { reqId, url });
    
    const response = await fetch(BROWSER_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BROWSER_SERVICE_TOKEN ? { 'Authorization': `Bearer ${BROWSER_SERVICE_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        url,
        waitFor: 2000, // Wait for JS to render
        format: 'html',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Browser service error: HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const text = extractTextFromHtml(html);
    
    if (text.length < 100) {
      throw new Error('Browser automation fetched content too short');
    }
    
    attempts.push({ method: 'browser_automation', success: true });
    
    return {
      success: true,
      data: {
        ...parseJobDetails(text, url, html),
        method: 'browser_automation',
      },
      method: 'browser_automation',
      attempts,
    };
  } catch (error) {
    const err = error as Error;
    logger.warn('fetch-jd-robust: browser automation failed', { reqId, error: err.message });
    attempts.push({ method: 'browser_automation', success: false, error: err.message });
    
    return {
      success: false,
      error: err.message,
      attempts,
    };
  }
}

// Main fetch function - tries all methods in order
export async function fetchJobDescription(url: string): Promise<FetchResult> {
  const reqId = newReqId();
  const allAttempts: FetchResult['attempts'] = [];
  
  logger.info('fetch-jd-robust: starting robust fetch', { reqId, url });
  
  // Validate URL
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      error: 'Invalid URL provided. Please provide a valid HTTP/HTTPS URL.',
      attempts: [],
    };
  }
  
  // Check if it's a known job board that might need special handling
  const board = detectJobBoard(url);
  if (board) {
    logger.info('fetch-jd-robust: detected job board', { reqId, board, url });
  }
  
  // Method 1: Standard fetch with enhanced headers
  const result1 = await methodStandardFetch(url);
  if (result1.success) {
    return result1;
  }
  allAttempts.push(...(result1.attempts || []));
  
  // Method 2: Alternative fetch (different browser signature)
  const result2 = await methodAltFetch(url);
  if (result2.success) {
    return { ...result2, attempts: allAttempts };
  }
  allAttempts.push(...(result2.attempts || []));
  
  // Method 3: Try CORS proxy as last resort
  const result3 = await methodCORSProxy(url);
  if (result3.success) {
    return { ...result3, attempts: allAttempts };
  }
  allAttempts.push(...(result3.attempts || []));
  
  // Method 4: Try browser automation (if configured)
  if (BROWSER_SERVICE_URL) {
    const result4 = await methodBrowserAutomation(url);
    if (result4.success) {
      return { ...result4, attempts: allAttempts };
    }
    allAttempts.push(...(result4.attempts || []));
  }
  
  // All methods failed
  const lastError = allAttempts[allAttempts.length - 1]?.error || 'Unknown error';
  logger.error('fetch-jd-robust: all methods failed', { 
    reqId, 
    url,
    attempts: allAttempts 
  });
  
  return {
    success: false,
    error: 'Failed to fetch job description. Tried ' + allAttempts.length + ' methods. Last error: ' + lastError + '. The URL may be blocked, require authentication, or be inaccessible from the server.',
    attempts: allAttempts,
  };
}
