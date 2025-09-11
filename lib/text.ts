// lib/text.ts
// Dependency-free text helpers: tokenize, TF-IDF cosine, sentence stats

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","by","for","from","has","he","in","is",
  "it","its","of","on","that","the","to","was","were","will","with","this",
  "i","you","your","we","our","they","their","them","or","but","if","than",
  "then","so","such","these","those","over","under","into","out","about",
  "up","down","not"
]);

/** Lowercase tokenization; keeps tech-ish tokens (+, #, ., -) */
export function tokenize(text: string): string[] {
  const tokens = (text || "")
    .toLowerCase()
    .match(/[a-z0-9.+#-]+/g) || [];
  return tokens.filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/** Build term frequency map */
function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

/** Compute TF-IDF cosine similarity (0..100) between two strings */
export function tfidfCosine(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const fa = tf(ta);
  const fb = tf(tb);

  // Document frequency across the two docs
  const vocab = new Set<string>([...fa.keys(), ...fb.keys()]);
  const N = 2;
  const idf = new Map<string, number>();
  for (const term of vocab) {
    const df = (fa.has(term) ? 1 : 0) + (fb.has(term) ? 1 : 0);
    // smoothed IDF
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }

  // Build vectors
  let dot = 0, n1 = 0, n2 = 0;
  for (const term of vocab) {
    const wa = (fa.get(term) || 0) * (idf.get(term) || 0);
    const wb = (fb.get(term) || 0) * (idf.get(term) || 0);
    dot += wa * wb;
    n1 += wa * wa;
    n2 += wb * wb;
  }

  if (!n1 || !n2) return 0;
  return (dot / (Math.sqrt(n1) * Math.sqrt(n2))) * 100;
}

/** Basic sentence stats for clarity metrics */
export function sentenceStats(text: string) {
  const sentences = (text.match(/[^.!?]+[.!?]/g) || [text]).map(s => s.trim());
  const words = (text.match(/\b\w+\b/g) || []).length;
  const avgLen = sentences.length ? words / sentences.length : 0;
  return { sentences: sentences.length, words, avgLen };
}
