// lib/paperweight.ts
// Paperweight client for Resume ATS Reviewer
// - Prefers calling your MarkItDown-powered Paperweight (Render or local)
// - Falls back to local pdf-parse if the remote service is unavailable
// - Returns plain text + ATS-friendly "hints" (headings, bullets, links, emails, phones, etc.)

import LinkifyIt from "linkify-it";
import type { DocHints } from "@/lib/analyze";

// What we return to the route/analyzer
export type PaperweightResult = {
  text: string;          // plain text for the analyzer
  hints: DocHints;       // structural signals
  markdown?: string;     // optional, if remote returns markdown
  source: "remote-render" | "remote-local" | "local-fallback" | "plain";
  endpoint?: string;     // which remote endpoint we used (if any)
};

// ---------- Configuration helpers ----------

type Target = "auto" | "render" | "local" | "off";

/**
 * Choose which Paperweight endpoint to use.
 * Environment variables:
 *   PAPERWEIGHT_TARGET = auto | render | local | off
 *   PAPERWEIGHT_RENDER_URL (defaults to your Render URL)
 *   PAPERWEIGHT_LOCAL_URL  (defaults to http://localhost:8000)
 *   PAPERWEIGHT_API_KEY    (optional auth header x-api-key)
 */
function pickEndpoint(): { endpoint?: string; target: Target } {
  const target = ((process.env.PAPERWEIGHT_TARGET || "auto").toLowerCase() as Target);
  const renderUrl = (process.env.PAPERWEIGHT_RENDER_URL?.trim()
    || "https://paperweight-i5o3.onrender.com").replace(/\/+$/, "");
  const localUrl  = (process.env.PAPERWEIGHT_LOCAL_URL?.trim()
    || "http://localhost:8000").replace(/\/+$/, "");

  if (target === "off") return { endpoint: undefined, target };
  if (target === "render") return { endpoint: renderUrl, target };
  if (target === "local")  return { endpoint: localUrl,  target };

  // auto: during development, prefer local; otherwise prefer render
  if (process.env.NODE_ENV !== "production") return { endpoint: localUrl, target: "auto" };
  return { endpoint: renderUrl, target: "auto" };
}

// ---------- Public API ----------

/**
 * Main entry: accept a PDF buffer (ArrayBuffer/Uint8Array/Buffer),
 * call remote Paperweight (MarkItDown) when available,
 * and fall back to local pdf-parse if needed.
 */
export async function paperweightExtract(
  buf: Uint8Array | ArrayBuffer | Buffer
): Promise<PaperweightResult> {
  const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBuffer);
  const { endpoint, target } = pickEndpoint();

  // 1) Try remote (Render or local) unless target == "off"
  if (endpoint) {
    try {
      const remote = await extractRemote(data, endpoint);
      // markdown → plain text for analyzer
      const textFromMd = remote.markdown ? markdownToText(remote.markdown) : remote.text;
      const hints = ensureHints(remote.hints ?? deriveHints(remote.markdown ?? remote.text ?? ""));
      return {
        text: textFromMd || "",
        hints,
        markdown: remote.markdown,
        source: endpoint.includes("localhost") ? "remote-local" : "remote-render",
        endpoint: `${endpoint.replace(/\/+$/, "").replace(/\/convert$/, "")}/convert`,
      };
    } catch (e: any) {
      // fall through to local
      console.warn(`Paperweight remote failed (${endpoint}):`, e?.message || e);
    }
  }

  // 2) Local fallback with pdf-parse (Node-only; never bundled on client)
  const local = await extractLocal(data);
  return {
    text: local.text,
    hints: ensureHints(local.hints ?? deriveHints(local.text)),
    source: "local-fallback",
  };
}

// ---------- Remote call (MarkItDown service) ----------

type RemoteResult = { text?: string; markdown?: string; hints?: Partial<DocHints> };

/**
 * Call remote Paperweight at POST /convert (multipart form, field: file).
 * Expected JSON shape (flexible):
 *   { markdown?: string, text?: string, hints?: {...} }
 */
async function extractRemote(data: Uint8Array, endpoint: string): Promise<RemoteResult> {
  const base = endpoint.replace(/\/+$/, "").replace(/\/convert$/, "");
  const url = `${base}/convert`;
  const apiKey = process.env.PAPERWEIGHT_API_KEY;

  // multipart/form-data with field name "file"
  const form = new FormData();
  const blob = new Blob([new Uint8Array(data.buffer as ArrayBuffer)], { type: "application/pdf" });
  form.append("file", blob, "document.pdf");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        "Accept": "application/json",
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const msg = await safeText(res);
      throw new Error(`Remote ${res.status}: ${msg}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function safeText(res: Response): Promise<string> {
  try { return (await res.text()).slice(0, 240); } catch { return ""; }
}

// ---------- Local fallback (pdf-parse) ----------

async function extractLocal(data: Uint8Array): Promise<{ text: string; hints?: Partial<DocHints> }> {
  try {
    // Load pdf-parse at runtime so Next.js never vendor-chunks it
    // eslint-disable-next-line no-eval
    const req: NodeRequire = eval("require");
    const mod = req("pdf-parse");
    const pdfParse = (mod as any).default ?? mod;

    const out = await pdfParse(Buffer.from(data));
    const text = typeof out?.text === "string" ? out.text : "";
    const pages = out?.numpages;
    const info = out?.info;
    const metadata = out?.metadata?._metadata ?? out?.metadata;

    return {
      text: sanitizeText(text),
      hints: {
        ...deriveHints(text),
        pages,
        info,
        metadata,
        method: "pdf-parse",
      },
    };
  } catch {
    // last resort: naive UTF-8 decode
    const text = new TextDecoder().decode(data);
    return { text: sanitizeText(text), hints: { ...deriveHints(text), method: "utf8" } };
  }
}

// ---------- Markdown → plain text + hints ----------

function markdownToText(md: string): string {
  // very lightweight de-markdown (good enough for NLP scoring)
  return md
    // code fences
    .replace(/```[\s\S]*?```/g, " ")
    // headings
    .replace(/^#{1,6}\s+/gm, "")
    // lists
    .replace(/^\s*[-*+]\s+/gm, "• ")
    // links [text](url) -> text (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    // emphasis
    .replace(/[*_~`]/g, " ")
    // collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeText(raw: string): string {
  return raw
    .replace(/\u00A0/g, " ")
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2") // de-hyphenate line breaks
    .replace(/[•·▪●▶►■□]/g, "•")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function deriveHints(textOrMd: string): DocHints {
  const linkify = new LinkifyIt();
  const emails = uniq(textOrMd.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi) || []);
  const phones = uniq(textOrMd.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g) || []);
  const links  = uniq((linkify.match(textOrMd)?.map(m => m.url) || []) as string[]);

  const lines = textOrMd.split("\n").map(l => l.trim());
  const headings: string[] = [];
  const bullets: string[]  = [];

  for (const ln of lines) {
    if (!ln) continue;
    if (/^#{1,6}\s+/.test(ln)) {
      headings.push(ln.replace(/^#{1,6}\s+/, "").trim());
      continue;
    }
    if (/^(?:•|\*|-|\+)\s+/.test(ln)) {
      bullets.push(ln.replace(/^(?:•|\*|-|\+)\s+/, "").trim());
      continue;
    }
    // Also treat short ALL-CAPS lines as headings
    const isShort = ln.length <= 80;
    const allCapsish = /^[A-Z0-9 &/+\-]{3,}$/.test(ln) && !/\d{4,}/.test(ln);
    if (isShort && allCapsish) headings.push(ln);
  }

  return {
    emails,
    phones,
    links,
    headings: uniq(headings).slice(0, 50),
    bullets: bullets.slice(0, 500),
    charCount: textOrMd.length,
    method: "pdf-parse", // remote may not declare; analyzer only checks presence
  };
}

function ensureHints(h: Partial<DocHints>): DocHints {
  return {
    emails: h.emails ?? [],
    phones: h.phones ?? [],
    links: h.links ?? [],
    headings: h.headings ?? [],
    bullets: h.bullets ?? [],
    charCount: h.charCount ?? 0,
    method: (h.method as DocHints["method"]) ?? "pdf-parse",
    pages: h.pages,
    info: h.info,
    metadata: h.metadata,
  };
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
