// lib/rewriter.ts
export function suggestRewrites(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length < 40 || out.length >= 6) continue;
    const rewritten = rewriteLine(line);
    if (rewritten) out.push(rewritten);
  }
  return out;
}

function rewriteLine(line: string): string | null {
  const startsPassive = /\b(was|were|been|being|be)\b/i.test(line);
  const hasMetric = /\b\d+(\.\d+)?%|\b\d{2,}(?:k|m)?\b/i.test(line);
  let base = line.replace(/^[-*•▪●]\s*/, "").trim();
  if (startsPassive) base = base.replace(/\b(was|were|been|being|be)\b\s*/i, "");
  const tmpl = `• ${capitalize(firstVerb(base))} ${restAfterFirstVerb(base)}${hasMetric ? "" : " — quantify impact."}`.replace(/\s+/g, " ").trim();
  return tmpl.length > 40 ? tmpl : null;
}

function firstVerb(s: string): string { return capitalize((s.split(/\s+/)[0] || "Delivered").replace(/[^\w-]/g, "")); }
function restAfterFirstVerb(s: string): string { return s.split(/\s+/).slice(1).join(" ") || "measurable outcomes for stakeholders."; }
function capitalize(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s; }
