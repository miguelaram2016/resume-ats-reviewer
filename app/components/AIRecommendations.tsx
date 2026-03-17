'use client';
import React, { useState } from 'react';

interface BulletRewrite {
  original: string;
  improved: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

interface SummarySuggestion {
  current?: string;
  suggested: string;
  isNew: boolean;
  keyPoints: string[];
}

interface FormattingAdvice {
  category: string;
  issue: string;
  suggestion: string;
  priority: 'critical' | 'warning' | 'info';
}

interface Improvements {
  bulletRewrites: BulletRewrite[];
  summarySuggestions: SummarySuggestion[];
  skillsToAdd: string[];
  experienceImprovements: { section: string; original: string; suggestions: string[] }[];
  formattingAdvice: FormattingAdvice[];
  overallActionPlan: string[];
}

interface Props {
  improvements: Improvements | null;
}

function ExpandableSection({ 
  title, 
  children, 
  defaultOpen = false,
  badge,
  badgeColor 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`text-xs px-2 py-1 rounded-full ${badgeColor || 'bg-gray-200'}`}>
              {badge}
            </span>
          )}
          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}

function BulletRewriteCard({ rewrite }: { rewrite: BulletRewrite }) {
  const impactColors = {
    high: 'bg-red-100 border-red-300',
    medium: 'bg-yellow-100 border-yellow-300',
    low: 'bg-green-100 border-green-300',
  };
  
  const impactLabels = {
    high: 'High Impact',
    medium: 'Medium Impact',
    low: 'Low Impact',
  };
  
  return (
    <div className={`border rounded-lg p-3 ${impactColors[rewrite.impact]}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium opacity-70">{impactLabels[rewrite.impact]}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="opacity-50">Original:</span>
          <p className="line-through opacity-70">{rewrite.original}</p>
        </div>
        <div>
          <span className="opacity-50">Improved:</span>
          <p className="font-medium text-green-800">{rewrite.improved}</p>
        </div>
        <p className="text-xs opacity-60">{rewrite.reason}</p>
      </div>
    </div>
  );
}

export function AIRecommendations({ improvements }: Props) {
  if (!improvements) return null;
  
  const { bulletRewrites, summarySuggestions, skillsToAdd, formattingAdvice, overallActionPlan } = improvements;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">🤖 AI Recommendations</h2>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          Actionable Improvements
        </span>
      </div>
      
      {/* Overall Action Plan */}
      {overallActionPlan.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">📋 Your Action Plan</h3>
          <ul className="space-y-2">
            {overallActionPlan.map((action, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="mt-0.5">{action.charAt(0)}</span>
                <span>{action.slice(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Summary Suggestions */}
      {summarySuggestions.length > 0 && (
        <ExpandableSection 
          title="📝 Professional Summary" 
          defaultOpen={summarySuggestions[0]?.isNew}
          badge={summarySuggestions[0]?.isNew ? 'New' : 'Update'}
          badgeColor="bg-blue-100 text-blue-800"
        >
          <div className="space-y-3">
            {summarySuggestions.map((summary, i) => (
              <div key={i} className="space-y-2">
                {summary.current && (
                  <div>
                    <span className="text-xs opacity-50">Current:</span>
                    <p className="text-sm opacity-70 line-through">{summary.current}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs opacity-50">Suggested:</span>
                  <p className="text-sm font-medium">{summary.suggested}</p>
                </div>
                {summary.keyPoints.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {summary.keyPoints.map((point, j) => (
                      <span key={j} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {point}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
      
      {/* Bullet Point Rewrites */}
      {bulletRewrites.length > 0 && (
        <ExpandableSection 
          title="✏️ Bullet Point Rewrites" 
          badge={`${bulletRewrites.length} suggestions`}
          badgeColor="bg-green-100 text-green-800"
        >
          <div className="grid gap-3">
            {bulletRewrites.slice(0, 5).map((rewrite, i) => (
              <BulletRewriteCard key={i} rewrite={rewrite} />
            ))}
            {bulletRewrites.length > 5 && (
              <p className="text-xs text-center opacity-50">
                +{bulletRewrites.length - 5} more suggestions available
              </p>
            )}
          </div>
        </ExpandableSection>
      )}
      
      {/* Skills to Add */}
      {skillsToAdd.length > 0 && (
        <ExpandableSection 
          title="💡 Skills to Add" 
          badge={`${skillsToAdd.length}`}
          badgeColor="bg-purple-100 text-purple-800"
        >
          <div className="flex flex-wrap gap-2">
            {skillsToAdd.map((skill, i) => (
              <span key={i} className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                + {skill}
              </span>
            ))}
          </div>
          <p className="text-xs mt-2 opacity-60">
            These skills were found in the job description but not in your resume.
          </p>
        </ExpandableSection>
      )}
      
      {/* Formatting Advice */}
      {formattingAdvice.length > 0 && (
        <ExpandableSection 
          title="📐 Formatting Improvements"
          defaultOpen={formattingAdvice.some(f => f.priority === 'critical')}
        >
          <div className="space-y-3">
            {formattingAdvice.map((advice, i) => {
              const priorityColors = {
                critical: 'border-red-300 bg-red-50',
                warning: 'border-yellow-300 bg-yellow-50',
                info: 'border-blue-300 bg-blue-50',
              };
              const priorityLabels = {
                critical: '🔴 Critical',
                warning: '🟡 Warning',
                info: 'ℹ️ Info',
              };
              
              return (
                <div key={i} className={`border rounded-lg p-3 ${priorityColors[advice.priority]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm">{priorityLabels[advice.priority]}</span>
                    <span className="text-xs opacity-60">{advice.category}</span>
                  </div>
                  <p className="text-sm mt-1">{advice.suggestion}</p>
                </div>
              );
            })}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
}
