# Resume & ATS Reviewer

A web‑deployable tool that analyzes resumes against job descriptions, flags ATS pitfalls, scores alignment, and provides actionable feedback.

## Stack
- **Frontend**: Next.js 14+ (App Router, TypeScript) + Tailwind + shadcn/ui
- **Server**: Next.js Route Handlers (Node runtime)
- **Deploy**: Vercel
- **Parsing**: `pdf-parse` (PDF), `mammoth` (DOCX)
- **NLP**: `natural` (TF‑IDF), `compromise` (POS-ish helpers)
- **JD Cleaner**: `jsdom` + `@mozilla/readability`
- **Export**: Markdown + PDF (PDFKit)
- **Storage (optional)**: Prisma + SQLite/Postgres (placeholder schema included)

## Features
- Inputs: Resume (PDF/DOCX/Text), JD (paste/URL)
- Analysis: ATS compliance, keyword match, impact signals, clarity/style
- Outputs: Overall/ATS/Keyword/Impact/Clarity scores, flags, missing keywords, rewrites, tailored summary, fix list
- Extras: **PII redaction toggle**, file‑name linting, **Export to Markdown & PDF**, exposed scoring weights

## Local Setup
```bash
npm install
npm run dev
# open http://localhost:3000
```

### Re-create via bootstrap script
```bash
chmod +x ./bootstrap.sh && ./bootstrap.sh <your-github-username>
```

## API
- `POST /api/analyze` — form-data: `resume` (file) or `resume_text`, `jd`, optional `weights` (JSON), `redact_pii` ("true"|"false")
- `POST /api/fetch-jd` — `{ url }` returns `{ title, text }` using Readability
- `POST /api/export?kind=md|pdf` — body is analysis payload; returns `.md` or `.pdf` file

## Notes
- Weights default to ATS 0.30, Keywords 0.35, Impact 0.20, Clarity 0.15 and can be tuned in the UI.
- PII redaction is a first pass; extend `lib/pii.ts` as needed.
- PDF export uses a simple text render for portability.
- Prisma schema is included for future persistence; not used yet.

## Deploy (Vercel)
1. Push to GitHub
2. Create a new Vercel project, import the repo
3. Set **Node.js Runtime** for API routes
4. Deploy