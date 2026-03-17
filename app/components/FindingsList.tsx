'use client';
import React, { useState } from 'react';

interface Finding {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  description?: string;
  items?: string[];
  [key: string]: any;
}

// Helper to detect finding type from content
function detectType(item: string): 'success' | 'warning' | 'error' | 'info' {
  const lower = item.toLowerCase();
  if (lower.includes('great') || lower.includes('good') || lower.includes('excellent') || lower.includes('success')) return 'success';
  if (lower.includes('missing') || lower.includes('fail') || lower.includes('error') || lower.includes('critical')) return 'error';
  if (lower.includes('consider') || lower.includes('suggest') || lower.includes('recommend') || lower.includes('warning')) return 'warning';
  return 'info';
}

// Parse item that might be an object or string
function getItemText(item: any): string {
  if (typeof item === 'string') return item;
  if (item.text) return item.text;
  if (item.description) return item.description;
  if (item.message) return item.message;
  return JSON.stringify(item);
}

function getItemType(item: any): 'success' | 'warning' | 'error' | 'info' {
  if (typeof item === 'object' && item.type) return item.type;
  if (typeof item === 'string') return detectType(item);
  return 'info';
}

export function FindingsList({ title, items, defaultExpanded = true }: { 
  title: string; 
  items: string[]; 
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  
  if (!items?.length) return null;
  
  const displayItems = showAll ? items : items.slice(0, 5);
  const hasMore = items.length > 5;
  
  // Get icon for section
  const getSectionIcon = () => {
    if (title.toLowerCase().includes('flag') || title.toLowerCase().includes('issue')) {
      return (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    if (title.toLowerCase().includes('fix') || title.toLowerCase().includes('suggest')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    }
    if (title.toLowerCase().includes('bullet') || title.toLowerCase().includes('rewrite')) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };
  
  // Get color for finding type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'error': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' };
      default: return { bg: 'bg-muted', border: 'border-border', text: 'text-foreground', dot: 'bg-primary' };
    }
  };

  return (
    <section className="group">
      {/* Collapsible Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/30 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            {getSectionIcon()}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMore && (
            <span className="text-xs text-muted-foreground">
              {showAll ? 'Show less' : `+${items.length - 5} more`}
            </span>
          )}
          <svg 
            className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Expandable Content */}
      <div className={`
        overflow-hidden transition-all duration-300 ease-out
        ${isExpanded ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}
      `}>
        <div className="space-y-2">
          {(showAll ? items : displayItems).map((item, i) => {
            const type = getItemType(item);
            const colors = getTypeColor(type);
            const text = getItemText(item);
            
            return (
              <div 
                key={i}
                className={`
                  relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md
                  ${colors.bg} ${colors.border}
                  animate-fade-in-up
                `}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${colors.dot}`} />
                  <p className={`text-sm ${colors.text} leading-relaxed`}>{text}</p>
                </div>
              </div>
            );
          })}
          
          {/* Show More Button */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {showAll ? 'Show less' : `Show all ${items.length} items`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
