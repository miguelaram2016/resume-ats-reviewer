'use client';
import React, { useEffect, useState } from 'react';

type Props = { 
  label: string; 
  value: number; 
  small?: boolean;
  showPercent?: boolean;
  animated?: boolean;
};

export function ScoreGauge({ label, value, small, showPercent = true, animated = true }: Props) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  
  // Animated count-up effect
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, animated]);

  const displayPct = Math.max(0, Math.min(100, Math.round(displayValue)));
  
  // Color based on score - refined palette
  const getColor = (score: number) => {
    if (score >= 80) return { bg: '#10b981', light: 'rgba(16, 185, 129, 0.1)', gradient: 'from-emerald-500 to-teal-500' };
    if (score >= 60) return { bg: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)', gradient: 'from-amber-500 to-orange-500' };
    return { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.1)', gradient: 'from-red-500 to-rose-500' };
  };
  
  const getTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };
  
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' };
    if (score >= 60) return { label: 'Good', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Needs Work', color: 'bg-red-100 text-red-700' };
  };
  
  const color = getColor(displayPct);
  const textColor = getTextColor(displayPct);
  const status = getStatus(displayPct);

  // Circular progress calculations
  const size = small ? 48 : 160;
  const strokeWidth = small ? 4 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPct / 100) * circumference;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border border-border/50 bg-card 
      ${small ? 'p-3' : 'p-6'} 
      transition-all duration-300 hover:shadow-lg hover:shadow-primary/5
    `}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at top right, ${color.light}, transparent 70%)` }} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {!small && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color} transition-all duration-500`}>
              {status.label}
            </span>
          )}
        </div>
        
        {/* Main Score Display */}
        <div className="flex items-center justify-center">
          {small ? (
            // Compact bar style for small
            <div className="w-full space-y-2">
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${displayPct}%`,
                    background: `linear-gradient(90deg, ${color.bg}, ${color.bg}dd)`
                  }}
                />
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${textColor}`}>{displayPct}%</span>
              </div>
            </div>
          ) : (
            // Full circular gauge for large
            <div className="relative">
              <svg 
                width={size} 
                height={size} 
                className="transform -rotate-90"
                viewBox={`0 0 ${size} ${size}`}
              >
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={color.bg}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 8px ${color.bg}40)`
                  }}
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold tracking-tight ${textColor} transition-all duration-300`}>
                  {displayPct}
                </span>
                {showPercent && <span className="text-sm text-muted-foreground font-medium">percent</span>}
              </div>
            </div>
          )}
        </div>

        {/* Score breakdown for large */}
        {!small && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span className="font-medium">Score: {Math.round(displayValue)}/100</span>
              <span>100</span>
            </div>
            {/* Quality indicator bar */}
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${displayPct}%`,
                  background: `linear-gradient(90deg, ${color.bg}, ${color.bg}dd)`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
