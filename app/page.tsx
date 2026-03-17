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
  const [showConfig, setShowConfig] = useState(false);

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
        body: form,
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
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6 stagger-children">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary font-medium">AI-Powered Resume Analysis</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="gradient-text">Beat the ATS</span>
              <br />
              Every Single Time
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your resume and job description to get instant feedback on ATS compatibility, 
              keyword matching, and actionable improvements — all powered by AI.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">10s</div>
                <div className="text-sm text-muted-foreground">Analysis Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">99%</div>
                <div className="text-sm text-muted-foreground">ATS Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">50+</div>
                <div className="text-sm text-muted-foreground">Data Points</div>
              </div>
            </div>
            
            {/* JD URL Input */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 max-w-lg mx-auto">
              <input 
                value={jdUrl} 
                onChange={(e) => setJdUrl(e.target.value)} 
                placeholder="Paste job posting URL (optional)" 
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-card/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <button 
                onClick={fetchJDFromUrl} 
                disabled={!jdUrl}
                className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fetch JD
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Config Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <svg className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showConfig ? 'Hide' : 'Show'} Configuration
          </button>
        </div>
        
        {/* Config Panel */}
        {showConfig && (
          <div className="animate-fade-in-up">
            <ConfigPanel 
              weights={weights} 
              onChange={setWeights} 
              redact={redactPII} 
              onToggleRedact={() => setRedactPII((v) => !v)} 
            />
          </div>
        )}
        
        {/* Upload Card */}
        <div className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8 shadow-soft">
          <UploadCard onAnalyze={onAnalyze} loading={loading} />
        </div>
        
        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Error State */}
            {result.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Analysis Failed</h3>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Results */}
            {!result.error && (
              <>
                {/* Score Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold">Your Results</h2>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-12">
                    {/* Main Score */}
                    <div className="md:col-span-4">
                      <ScoreGauge 
                        label="Overall Score" 
                        value={result?.scores?.overall ?? 0} 
                      />
                      
                      {/* Export Buttons */}
                      <div className="mt-4 flex gap-3">
                        <button 
                          onClick={() => exportAs('md')} 
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-muted font-medium transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Export .md
                        </button>
                        <button 
                          onClick={() => exportAs('pdf')} 
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export .pdf
                        </button>
                      </div>
                    </div>
                    
                    {/* Score Breakdown */}
                    <div className="md:col-span-8">
                      <div className="grid grid-cols-2 gap-4">
                        <ScoreGauge 
                          small 
                          label="ATS Compatibility" 
                          value={result?.scores?.ats ?? 0} 
                        />
                        <ScoreGauge 
                          small 
                          label="Keyword Match" 
                          value={result?.scores?.keyword_match ?? 0} 
                        />
                        <ScoreGauge 
                          small 
                          label="Impact Score" 
                          value={result?.scores?.impact ?? 0} 
                        />
                        <ScoreGauge 
                          small 
                          label="Clarity" 
                          value={result?.scores?.clarity ?? 0} 
                        />
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Keywords Section */}
                <KeywordChips
                  missing={result?.missing_keywords ?? []}
                  matched={result?.matched_keywords ?? []}
                  initialLimit={10}
                />
                
                {/* Findings Sections */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <FindingsList 
                    title="🚩 Issues & Flags" 
                    items={result?.flags ?? []} 
                  />
                  <FindingsList 
                    title="🔧 Recommended Fixes" 
                    items={result?.fix_list ?? []} 
                  />
                </div>
                
                <FindingsList 
                  title="✏️ Suggested Bullet Rewrites" 
                  items={result?.suggested_rewrites ?? []} 
                  defaultExpanded={false}
                />
                
                <FindingsList 
                  title="📝 Tailored Summary" 
                  items={result?.tailored_summary ? [result.tailored_summary] : []} 
                  defaultExpanded={true}
                />
              </>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="container py-8 mt-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by AI • Your data is processed securely</p>
        </div>
      </footer>
    </div>
  );
}
