'use client';
import React, { useState } from 'react';
import { UploadCard } from './components/UploadCard';
import { ScoreGauge } from './components/ScoreGauge';
import { FindingsList } from './components/FindingsList';
import { KeywordChips } from './components/KeywordChips';
import { ConfigPanel } from './components/ConfigPanel';

export default function HomePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [weights, setWeights] = useState({ ats: 0.3, keyword_match: 0.35, impact: 0.2, clarity: 0.15 });
  const [redactPII, setRedactPII] = useState(true);
  const [jdUrl, setJdUrl] = useState('');
  async function onAnalyze(form: FormData) {
    setLoading(true);
    setResult(null);

    // include config in the form
    form.set("weights", JSON.stringify(weights));
    form.set("redact_pii", String(redactPII));

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort("client-timeout"), 30_000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form,            // FormData: don't set Content-Type yourself
        signal: ctrl.signal as any,
      });

      const json = await res.json().catch(() => ({ error: "Bad JSON from server" }));
      if (!res.ok) {
        console.error("analyze: API error", { status: res.status, body: json });
        setResult({ error: json?.error || `HTTP ${res.status}` });
      } else {
        setResult(json);
      }
    } catch (err: any) {
      console.error("analyze: fetch failed", err);
      setResult({ error: err?.message || "Network error" });
    } finally {
      clearTimeout(t);
      setLoading(false);  // ← guarantees spinner turns off
    }
  }

  async function fetchJDFromUrl() {
    if (!jdUrl) return;
    const res = await fetch('/api/fetch-jd', { method: 'POST', body: JSON.stringify({ url: jdUrl }) });
    const json = await res.json();
    const jd = json?.text || '';
    const ev = new CustomEvent('jd:paste', { detail: jd });
    window.dispatchEvent(ev);
  }
  async function exportAs(kind: 'md' | 'pdf') {
    if (!result) return;
    const res = await fetch(`/api/export?kind=${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'md' ? 'analysis.md' : 'analysis.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="container py-8 space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Resume & ATS Reviewer</h1>
          <div className="text-sm opacity-70">Paste/upload resume and JD, tune weights, toggle PII redaction, and export results.</div>
        </div>
        <div className="flex items-center gap-2">
          <input value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="JD URL (optional)" className="rounded-md border p-2 min-w-[280px]" />
          <button onClick={fetchJDFromUrl} className="rounded-lg bg-black px-4 py-2 text-white">Fetch JD</button>
        </div>
      </header>
      <ConfigPanel weights={weights} onChange={setWeights} redact={redactPII} onToggleRedact={() => setRedactPII((v) => !v)} />
      <UploadCard onAnalyze={onAnalyze} loading={loading} />
      {result && (
        <section className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4 space-y-4">
            <ScoreGauge label="Overall" value={result?.scores?.overall ?? 0} />
            <div className="grid grid-cols-2 gap-3">
              <ScoreGauge small label="ATS" value={result?.scores?.ats ?? 0} />
              <ScoreGauge small label="Keywords" value={result?.scores?.keyword_match ?? 0} />
              <ScoreGauge small label="Impact" value={result?.scores?.impact ?? 0} />
              <ScoreGauge small label="Clarity" value={result?.scores?.clarity ?? 0} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportAs('md')} className="rounded-lg border px-3 py-2">
                Export .md
              </button>
              <button onClick={() => exportAs('pdf')} className="rounded-lg bg-black text-white px-3 py-2">
                Export .pdf
              </button>
            </div>
          </div>
          <div className="md:col-span-8 space-y-6">
            <KeywordChips
              missing={result?.missing_keywords ?? []}
              matched={result?.matched_keywords ?? []}
              initialLimit={10}
            />
            <FindingsList title="Flags" items={result?.flags ?? []} />
            <FindingsList title="Fix List" items={result?.fix_list ?? []} />
            <FindingsList title="Suggested Bullet Rewrites" items={result?.suggested_rewrites ?? []} />
            <FindingsList title="Tailored Summary" items={result?.tailored_summary ? [result.tailored_summary] : []} />
          </div>
        </section>
      )}
    </main>
  );
}