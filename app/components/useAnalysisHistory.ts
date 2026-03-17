'use client';
import { useState, useEffect, useCallback } from 'react';

export interface AnalysisHistoryItem {
  id: string;
  timestamp: number;
  fileName?: string;
  jdTitle?: string;
  scores: {
    overall: number;
    ats: number;
    keyword_match: number;
    impact: number;
    clarity: number;
  };
  matchRate: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

const STORAGE_KEY = 'ats-reviewer-history';
const MAX_HISTORY_ITEMS = 50;

export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever history changes
  const saveToStorage = useCallback((items: AnalysisHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, []);

  const addToHistory = useCallback((item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: AnalysisHistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveToStorage(updated);
      return updated;
    });

    return newItem.id;
  }, [saveToStorage]);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getHistoryItem = useCallback((id: string) => {
    return history.find((item) => item.id === id);
  }, [history]);

  return {
    history,
    isLoaded,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
  };
}
