'use client';
import React from 'react';

type Props = { label: string; value: number; small?: boolean };
export function ScoreGauge({ label, value, small }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`rounded-2xl border p-4 ${small ? 'space-y-1' : 'space-y-2'}`}>
      <div className="text-sm opacity-70">{label}</div>
      <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
        <div className="h-3 bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm tabular-nums">{pct}%</div>
    </div>
  );
}