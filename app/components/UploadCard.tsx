'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';

type Props = { onAnalyze: (data: FormData) => void; loading?: boolean };
export function UploadCard({ onAnalyze, loading }: Props) {
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [jd, setJd] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [mode, setMode] = useState<'standalone' | 'full'>('full');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  useEffect(() => {
    const handler = (e: any) => setJd(e.detail);
    window.addEventListener('jd:paste', handler);
    return () => window.removeEventListener('jd:paste', handler);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'text/plain') {
        if (resumeFileRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          resumeFileRef.current.files = dt.files;
          setFileName(file.name);
        }
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    const file = resumeFileRef.current?.files?.[0];
    
    // If PDF file, parse it client-side first
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      try {
        // Dynamic import of PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10);
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        // Send parsed text instead of file
        fd.append('resume_text', fullText);
        console.log('[UploadCard] Client-side PDF parsed, text length:', fullText.length);
      } catch (err) {
        console.error('[UploadCard] Client-side PDF parsing failed:', err);
        // Fall back to sending file
        fd.append('resume', file);
      }
    } else if (file) {
      // Non-PDF file, send as-is
      fd.append('resume', file);
    }
    
    if (resumeText) fd.append('resume_text', resumeText);
    if (jd && mode === 'full') fd.append('jd', jd);
    onAnalyze(fd);
  }

  const hasResume = resumeText || resumeFileRef.current?.files?.length;
  const canSubmit = loading || !hasResume || (mode === 'full' && !jd);
  
  return (
    <div className="space-y-6">
      {/* Mode Toggle - Premium Tab Style */}
      <div className="flex justify-center">
        <div className="inline-flex bg-muted/50 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('standalone')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === 'standalone' 
                ? 'bg-white text-primary shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Analyze Resume Only
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === 'full' 
                ? 'bg-white text-primary shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Compare with Job Description
            </span>
          </button>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold">Your Resume</h3>
            </div>
            
            {/* Drag & Drop Zone */}
            <div 
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative group cursor-pointer transition-all duration-300 ${
                isDragging ? 'scale-[1.02]' : ''
              }`}
            >
              <input 
                ref={resumeFileRef}
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`
                relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : fileName 
                    ? 'border-green-400 bg-green-50/50' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
              `}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M0 32V0h32" fill="none" stroke="currentColor" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                
                <div className="relative">
                  {fileName ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 flex items-center justify-center animate-scale-in">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-medium text-foreground">{fileName}</p>
                      <p className="text-sm text-muted-foreground">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Drop your resume here</p>
                        <p className="text-sm text-muted-foreground">or click to browse • PDF, DOCX, TXT</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text Input Fallback */}
            <div className="relative">
              <textarea 
                placeholder="Or paste resume text directly..." 
                value={resumeText} 
                onChange={(e) => setResumeText(e.target.value)} 
                className="w-full min-h-[140px] rounded-xl border border-border bg-card p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              />
              {resumeText && (
                <div className="absolute bottom-3 right-3 text-xs text-green-600 font-medium">
                  {resumeText.length} characters
                </div>
              )}
            </div>
          </div>

          {/* Job Description Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold">Job Description</h3>
              {mode === 'standalone' && <span className="text-xs text-muted-foreground">(Optional)</span>}
            </div>
            
            <div className="relative h-full">
              <textarea 
                placeholder={
                  mode === 'standalone' 
                    ? "Paste job description to get keyword insights and match scoring..." 
                    : "Paste the job description you want to compare against..."
                } 
                value={jd} 
                onChange={(e) => setJd(e.target.value)} 
                disabled={mode === 'standalone'}
                className={`w-full min-h-[280px] lg:min-h-[320px] rounded-xl border border-border bg-card p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
                  mode === 'standalone' ? 'bg-muted/30 cursor-not-allowed opacity-60' : ''
                }`}
              />
              {jd && mode === 'full' && (
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {jd.split(/\s+/).length} words
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button 
            type="submit" 
            disabled={canSubmit}
            className={`
              relative overflow-hidden group px-8 py-4 rounded-2xl font-semibold text-lg
              transition-all duration-300 disabled:cursor-not-allowed
              ${loading 
                ? 'bg-primary/80 cursor-wait' 
                : 'bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0'
              }
            `}
          >
            <span className="relative z-10 flex items-center gap-3">
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing Your Resume...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {mode === 'standalone' ? 'Analyze Resume' : 'Analyze & Compare'}
                </>
              )}
            </span>
            
            {/* Button Shine Effect */}
            {!loading && (
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
