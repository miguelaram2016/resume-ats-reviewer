// lib/normalizer.ts
// Text normalization and tokenization utilities

const ALIAS: Record<string, string> = {
  "nextjs": "next.js",
  "node": "node.js",
  "typescript": "ts",
  "javascript": "js",
};

const STOP = new Set([
  "and", "or", "the", "a", "an", "for", "of", "to", "with", "in", "on", "at", "by", "from", "as", "is", "are", "be",
  "our", "we", "you", "their", "they", "i", "company", "role", "position", "candidate", "seeking",
]);

export function normalize(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[""„‟]/g, '"')
    .replace(/[''‚‛]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[|•·●▪▶►]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[-_/\\]/g, " ")
    .replace(/\.(js|ts|tsx|jsx)\b/g, " $1 ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function alias(tok: string): string {
  return ALIAS[tok] ?? tok;
}

export function tokenize(nrm: string): string[] {
  const words = nrm.split(" ")
    .map(alias)
    .filter(w => w && w.length > 1 && !STOP.has(w));

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i+1]}`);
  }
  return [...words, ...bigrams];
}

export function toSet(tokens: string[]): Set<string> {
  const s = new Set<string>();
  for (const t of tokens) {
    const base = t.replace(/(ing|ed|es|s)$/, "");
    if (base.length > 1) s.add(base);
  }
  return s;
}

export function extractKeyPhrases(tokens: string[]): string[] {
  const phrases = new Set<string>();
  for (const t of tokens) {
    if (t.includes(" ")) {
      if (!/^(and|the|for|with|from|over|under|into|onto)\b/.test(t)) {
        phrases.add(t);
      }
    } else {
      if (/^[a-z0-9.+#-]{2,}$/.test(t) && !STOP.has(t)) {
        phrases.add(t);
      }
    }
  }
  return [...phrases];
}

export function isNear(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let diff = 0, i = 0, j = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diff++;
    if (diff > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return true;
}
