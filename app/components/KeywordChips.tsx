'use client';
import React, { useState } from 'react';

type Props = {
  matched: string[];
  missing: string[];
  initialLimit?: number;
};

export function KeywordChips({ matched = [], missing = [], initialLimit = 10 }: Props) {
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [showAllMatched, setShowAllMatched] = useState(false);

  const miss = showAllMissing ? missing : missing.slice(0, initialLimit);
  const mat  = showAllMatched ? matched : matched.slice(0, initialLimit);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Keywords</h3>
        <div className="text-sm opacity-70 mb-2">
          Missing ({missing.length}) • Matched ({matched.length})
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm">Missing</div>
            <div className="flex flex-wrap gap-2">
              {miss.map((k, i) => (
                <span key={`miss-${i}`} className="rounded-full bg-red-900/20 border border-red-600 px-2 py-1 text-xs">
                  {k}
                </span>
              ))}
            </div>
            {missing.length > initialLimit && (
              <button
                onClick={() => setShowAllMissing(v => !v)}
                className="mt-2 text-xs underline opacity-80"
              >
                {showAllMissing ? 'Show less' : `Show more (${missing.length - initialLimit})`}
              </button>
            )}
          </div>
          <div>
            <div className="mb-2 text-sm">Matched</div>
            <div className="flex flex-wrap gap-2">
              {mat.map((k, i) => (
                <span key={`mat-${i}`} className="rounded-full bg-green-900/20 border border-green-600 px-2 py-1 text-xs">
                  {k}
                </span>
              ))}
            </div>
            {matched.length > initialLimit && (
              <button
                onClick={() => setShowAllMatched(v => !v)}
                className="mt-2 text-xs underline opacity-80"
              >
                {showAllMatched ? 'Show less' : `Show more (${matched.length - initialLimit})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
