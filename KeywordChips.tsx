'use client';
import React from 'react';
export function KeywordChips({ missing, matched }: { missing: string[]; matched: string[] }) {
  return (
    <section className="rounded-2xl border p-4 space-y-3">
      <h3 className="font-semibold">Keywords</h3>
      <div className="space-y-1">
        <div className="text-sm opacity-70">Missing</div>
        <div className="flex flex-wrap gap-2">
          {missing?.map((k, i) => (
            <span key={i} className="rounded-full border px-2 py-1 text-xs bg-red-50">
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm opacity-70">Matched</div>
        <div className="flex flex-wrap gap-2">
          {matched?.map((k, i) => (
            <span key={i} className="rounded-full border px-2 py-1 text-xs bg-green-50">
              {k}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}