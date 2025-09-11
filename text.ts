import natural from 'natural';

export function tokenize(text: string): string[] {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize((text || '').toLowerCase());
}

export function tfidfCosine(a: string, b: string): number {
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(a || '');
  tfidf.addDocument(b || '');
  const vocab = new Set<string>();
  tfidf.listTerms(0).forEach((t) => vocab.add(t.term));
  tfidf.listTerms(1).forEach((t) => vocab.add(t.term));
  const v1: number[] = [];
  const v2: number[] = [];
  for (const term of vocab) {
    // @ts-ignore
    const w1 = tfidf.tfidf(term, 0) as number;
    // @ts-ignore
    const w2 = tfidf.tfidf(term, 1) as number;
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