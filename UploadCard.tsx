'use client';
import React, { useEffect, useRef, useState } from 'react';

type Props = { onAnalyze: (data: FormData) => void; loading?: boolean };
export function UploadCard({ onAnalyze, loading }: Props) {
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const [jd, setJd] = useState('');
  const [resumeText, setResumeText] = useState('');
  useEffect(() => {
    const handler = (e: any) => setJd(e.detail);
    window.addEventListener('jd:paste', handler);
    return () => window.removeEventListener('jd:paste', handler);
  }, []);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    const file = resumeFileRef.current?.files?.[0];
    if (file) fd.append('resume', file);
    if (resumeText) fd.append('resume_text', resumeText);
    if (jd) fd.append('jd', jd);
    onAnalyze(fd);
  }
  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border p-4 md:p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="font-medium">Resume</label>
          <input ref={resumeFileRef} type="file" accept=".pdf,.docx,.txt" className="block w-full" />
          <textarea placeholder="…or paste resume text" value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="w-full min-h-[120px] rounded-md border p-2" />
        </div>
        <div className="space-y-2">
          <label className="font-medium">Job Description</label>
          <textarea placeholder="Paste JD or URL-fetched text" value={jd} onChange={(e) => setJd(e.target.value)} className="w-full min-h-[180px] rounded-md border p-2" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60">
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>
    </form>
  );
}