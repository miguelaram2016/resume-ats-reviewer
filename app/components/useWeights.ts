'use client';
import { useState, useEffect, useCallback } from 'react';

export interface Weights {
  ats: number;
  keyword_match: number;
  impact: number;
  clarity: number;
}

const STORAGE_KEY = 'ats-reviewer-weights';
const DEFAULT_WEIGHTS: Weights = {
  ats: 0.3,
  keyword_match: 0.35,
  impact: 0.2,
  clarity: 0.15,
};

export function useWeights() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [redactPII, setRedactPII] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedWeights = localStorage.getItem(STORAGE_KEY);
      if (storedWeights) {
        const parsed = JSON.parse(storedWeights);
        // Validate the weights
        if (
          typeof parsed.ats === 'number' &&
          typeof parsed.keyword_match === 'number' &&
          typeof parsed.impact === 'number' &&
          typeof parsed.clarity === 'number'
        ) {
          setWeights(parsed);
        }
      }

      const storedRedact = localStorage.getItem('ats-reviewer-redact-pii');
      if (storedRedact !== null) {
        setRedactPII(storedRedact === 'true');
      }
    } catch (e) {
      console.error('Failed to load weights:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save weights to localStorage whenever they change
  const updateWeights = useCallback((newWeights: Weights) => {
    setWeights(newWeights);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWeights));
    } catch (e) {
      console.error('Failed to save weights:', e);
    }
  }, []);

  const toggleRedactPII = useCallback((value?: boolean) => {
    const newValue = value !== undefined ? value : !redactPII;
    setRedactPII(newValue);
    try {
      localStorage.setItem('ats-reviewer-redact-pii', String(newValue));
    } catch (e) {
      console.error('Failed to save redactPII:', e);
    }
  }, [redactPII]);

  const resetToDefaults = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
    setRedactPII(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WEIGHTS));
      localStorage.setItem('ats-reviewer-redact-pii', 'true');
    } catch (e) {
      console.error('Failed to reset weights:', e);
    }
  }, []);

  // Normalize weights to sum to 1
  const normalizeWeights = useCallback(() => {
    const total = weights.ats + weights.keyword_match + weights.impact + weights.clarity;
    if (total === 0) return DEFAULT_WEIGHTS;
    
    const normalized: Weights = {
      ats: weights.ats / total,
      keyword_match: weights.keyword_match / total,
      impact: weights.impact / total,
      clarity: weights.clarity / total,
    };
    
    updateWeights(normalized);
    return normalized;
  }, [weights, updateWeights]);

  return {
    weights,
    redactPII,
    isLoaded,
    updateWeights,
    toggleRedactPII,
    resetToDefaults,
    normalizeWeights,
  };
}
