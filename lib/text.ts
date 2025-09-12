// lib/text.ts
export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9.+#-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

export function tfidfCosine(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;

  const fa = termFreq(ta);
  const fb = termFreq(tb);

  const vocab = new Set([...fa.keys(), ...fb.keys()]);
  const v1: number[] = [];
  const v2: number[] = [];

  for (const term of vocab) {
    const w1 = fa.get(term) || 0;
    const w2 = fb.get(term) || 0;
    v1.push(w1);
    v2.push(w2);
  }

  const dot = v1.reduce((s, _, i) => s + v1[i] * v2[i], 0);
  const n1 = Math.sqrt(v1.reduce((s, x) => s + x * x, 0));
  const n2 = Math.sqrt(v2.reduce((s, x) => s + x * x, 0));
  if (!n1 || !n2) return 0;

  return (dot / (n1 * n2)) * 100; // 0..100
}

export function sentenceStats(text: string) {
  const sentences = (text.match(/[^.!?]+[.!?]/g) || [text]).map((s) => s.trim());
  const words = (text.match(/\b\w+\b/g) || []).length;
  const avgLen = sentences.length ? words / sentences.length : 0;
  return { sentences: sentences.length, words, avgLen };
}
