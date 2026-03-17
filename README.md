# Resume & ATS Reviewer

A web‑deployable tool that analyzes resumes against job descriptions, flags ATS pitfalls, scores alignment, and provides actionable feedback.

## Stack
- **Frontend**: Next.js 14+ (App Router, TypeScript) + Tailwind + shadcn/ui
- **Server**: Next.js Route Handlers (Node runtime)
- **Deploy**: Vercel
- **Parsing**: Client-side PDF.js (browser) + mammoth (DOCX server-side)
- **NLP**: `natural` (TF‑IDF), `compromise` (POS-ish helpers)
- **JD Cleaner**: `jsdom` + `@mozilla/readability`
- **Export**: Markdown + PDF (PDFKit)
- **Storage (optional)**: Prisma + SQLite/Postgres (placeholder schema included)

## Features
- Inputs: Resume (PDF/DOCX/Text), JD (paste/URL)
- Analysis: ATS compliance, keyword match, impact signals, clarity/style
- Outputs: Overall/ATS/Keyword/Impact/Clarity scores, flags, missing keywords, rewrites, tailored summary, fix list
- Extras: **PII redaction toggle**, file‑name linting, **Export to Markdown & PDF**, exposed scoring weights

## PDF Parsing Architecture

PDF parsing is handled **client-side** in the browser using PDF.js. This approach was chosen because:

1. **Serverless compatibility**: Vercel's serverless functions cannot run PDF.js workers (they require Node.js workers)
2. **Browser native**: Browsers support web workers natively, making PDF parsing reliable
3. **Self-hosted worker**: The PDF.js worker (`/public/pdf.worker.min.js`) is self-hosted to avoid CDN dependencies

### Why self-host the worker?
- **Security**: Eliminates third-party CDN trust assumption
- **Reliability**: No external dependency that could go down or change
- **Version control**: Worker version is locked to pdfjs-dist package version

The worker file must match the pdfjs-dist version. Update it when upgrading the package:
```bash
# Copy matching worker to public/
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.js
```

## Local Setup
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Icons

This project uses [better-icons](https://github.com/better-auth/better-icons) for AI-powered icon search.

### Using with Codex

The project has an MCP config at `mcp.json` — Codex can search and add icons using natural language:

- `"Search for UI icons"`
- `"Get lucide:file-text as SVG"`
- `"Add a download icon to my export button"`

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
5. Ensure `public/pdf.worker.min.js` is included (Next.js includes public/ by default)