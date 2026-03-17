'use client';
import React from 'react';

type Props = {
  weights: { ats: number; keyword_match: number; impact: number; clarity: number };
  onChange: (w: any) => void;
  redact: boolean;
  onToggleRedact: () => void;
};

export function ConfigPanel({ weights, onChange, redact, onToggleRedact }: Props) {
  function set(key: keyof typeof weights, val: number) {
    const copy = { ...weights, [key]: val };
    onChange(copy);
  }
  const total = weights.ats + weights.keyword_match + weights.impact + weights.clarity;
  
  const weightLabels: Record<keyof typeof weights, { label: string; description: string; icon: React.ReactNode }> = {
    ats: {
      label: 'ATS Score',
      description: 'How well your resume passes ATS systems',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    keyword_match: {
      label: 'Keywords',
      description: 'Match with job description keywords',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    impact: {
      label: 'Impact',
      description: 'Quantified achievements & results',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    clarity: {
      label: 'Clarity',
      description: 'Readability & organization',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">Scoring Configuration</h2>
            <p className="text-xs text-muted-foreground">Customize how your score is calculated</p>
          </div>
        </div>
        
        {/* Total Weight Indicator */}
        <div className={`
          px-4 py-2 rounded-xl border text-sm font-medium transition-all
          ${Math.abs(total - 1) < 0.01 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-amber-50 border-amber-200 text-amber-700'
          }
        `}>
          Total Weight: {total.toFixed(2)}
          {Math.abs(total - 1) >= 0.01 && (
            <span className="ml-1 text-xs">(should equal 1.0)</span>
          )}
        </div>
      </div>

      {/* Weight Sliders */}
      <div className="grid gap-4 md:grid-cols-2">
        {(['ats', 'keyword_match', 'impact', 'clarity'] as const).map((key) => {
          const info = weightLabels[key];
          const value = weights[key];
          const percentage = Math.round(value * 100);
          
          return (
            <div 
              key={key} 
              className="group p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {info.icon}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{info.label}</span>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{percentage}%</span>
                </div>
              </div>
              
              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={percentage}
                  onChange={(e) => set(key, parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={value}
                    onChange={(e) => set(key, parseFloat(e.target.value || '0'))}
                    className="w-16 px-2 py-1 text-center rounded border bg-background text-xs"
                  />
                  <span>100%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PII Toggle */}
      <div className="pt-4 border-t border-border/50">
        <label className="flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium">Redact PII</span>
              <p className="text-xs text-muted-foreground">Hide personal info in analysis output</p>
            </div>
          </div>
          <div className="relative">
            <input 
              type="checkbox" 
              checked={redact} 
              onChange={onToggleRedact} 
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>
    </section>
  );
}
