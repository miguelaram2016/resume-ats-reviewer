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
  const [activeTab, setActiveTab] = useState<'all' | 'missing' | 'matched'>('all');

  const miss = showAllMissing ? missing : missing.slice(0, initialLimit);
  const mat = showAllMatched ? matched : matched.slice(0, initialLimit);

  const total = matched.length + missing.length;
  const matchRate = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  if (!total) return null;

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Keywords Analysis</h3>
            <p className="text-xs text-muted-foreground">
              {matchRate}% match rate • {total} total keywords
            </p>
          </div>
        </div>
        
        {/* Stats Pills */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-700">{missing.length}</span>
            <span className="text-xs text-red-500">missing</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">{matched.length}</span>
            <span className="text-xs text-emerald-500">matched</span>
          </div>
        </div>
      </div>

      {/* Tabs for Mobile */}
      <div className="flex sm:hidden gap-1 bg-muted/50 p-1 rounded-xl">
        {(['all', 'missing', 'matched'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-white shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1 text-xs opacity-60">
              ({tab === 'missing' ? missing.length : tab === 'matched' ? matched.length : total})
            </span>
          </button>
        ))}
      </div>

      {/* Keyword Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Missing Keywords */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Missing Keywords</span>
            </div>
            {missing.length > initialLimit && (
              <button
                onClick={() => setShowAllMissing(v => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllMissing ? 'Show less' : `Show all (${missing.length})`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(activeTab === 'all' || activeTab === 'missing' ? miss : []).map((k, i) => (
              <span 
                key={`miss-${i}`} 
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                  bg-red-50 border border-red-200 text-red-700 text-sm
                  animate-fade-in-up
                "
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {k}
              </span>
            ))}
            {activeTab === 'missing' && missing.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No missing keywords</p>
            )}
          </div>
        </div>

        {/* Matched Keywords */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Matched Keywords</span>
            </div>
            {matched.length > initialLimit && (
              <button
                onClick={() => setShowAllMatched(v => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllMatched ? 'Show less' : `Show all (${matched.length})`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(activeTab === 'all' || activeTab === 'matched' ? mat : []).map((k, i) => (
              <span 
                key={`mat-${i}`} 
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                  bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm
                  animate-fade-in-up
                "
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {k}
              </span>
            ))}
            {activeTab === 'matched' && matched.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No matched keywords</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Match Rate</span>
          <span className="font-medium">{matchRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${matchRate}%` }}
          />
        </div>
      </div>
    </section>
  );
}
