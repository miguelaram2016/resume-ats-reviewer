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
  return (
    <section className="rounded-2xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Config</h2>
        <div className="text-xs opacity-70">Total weight: {total.toFixed(2)}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(['ats', 'keyword_match', 'impact', 'clarity'] as const).map((k) => (
          <label key={k} className="flex items-center gap-3">
            <span className="w-40 text-sm capitalize">{k.replace('_', ' ')}</span>
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={(weights as any)[k]}
              onChange={(e) => set(k, parseFloat(e.target.value || '0'))}
              className="w-24 rounded-md border p-1"
            />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={redact} onChange={onToggleRedact} />
        <span className="text-sm">Redact PII in analysis output</span>
      </label>
      <div className="text-xs opacity-70">
        Weights are applied to ATS, Keyword Match, Impact, and Clarity to compute the overall score.
      </div>
    </section>
  );
}