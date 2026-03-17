# Resume & ATS Reviewer

A modern, AI-powered tool that analyzes resumes against job descriptions, flags ATS pitfalls, scores alignment, and provides actionable feedback to help you land more interviews.

## ✨ Why This Project?

- **ATS-Ready**: Checks 20+ resume formatting rules that cause ATS systems to reject applications
- **Keyword Optimization**: Matches your resume against job description keywords
- **Impact Analysis**: Evaluates action verbs and impact language
- **AI Suggestions**: Get rewritten bullet points and summary improvements
- **Privacy-First**: Optional PII redaction, no data stored externally
- **Self-Deployable**: Run it yourself on Vercel in minutes

## 🚀 Live Demo

**https://resumelytics.vercel.app**

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Server | Next.js Route Handlers (Node.js runtime) |
| Deployment | Vercel (serverless) |
| PDF Parsing | Client-side PDF.js (browser-native) |
| DOCX Parsing | mammoth (server-side) |
| NLP/Analysis | natural (TF-IDF), compromise |
| JD Fetching | jsdom + @mozilla/readability |
| Export | Markdown, PDF (PDFKit) |

## 📋 Features

### Input Options
- 📄 **Resume**: Upload PDF/DOCX or paste text directly
- 📋 **Job Description**: Paste text or fetch from URL

### Analysis Types
- **ATS Compliance** (20+ checks): File name, headings, layout, fonts, bullet points, contact info
- **Keyword Matching**: TF-IDF based matching with missing keyword suggestions
- **Impact Signals**: Action verbs, quantified achievements, power words
- **Clarity & Style**: Sentence structure, readability, repetition detection

### Outputs
- 📊 **Scores**: Overall, ATS, Keywords, Impact, Clarity (0-100%)
- 🚩 **Flags**: Issues found with severity levels
- 💡 **Suggestions**: Missing keywords, rewrite recommendations
- ✨ **AI Improvements**: Rewritten bullet points, improved summaries

### Extras
- ⚖️ **Adjustable Weights**: Tune scoring priorities in the UI
- 🔒 **PII Redaction**: Toggle to remove personal info from analysis
- 📛 **File Name Linting**: Checks if filename contains special characters
- 📥 **Export**: Download analysis as Markdown or PDF

## 🏗️ Architecture

### Client-Side PDF Parsing

PDF parsing happens **in the browser** using PDF.js. This was necessary because:

1. **Vercel serverless limitation**: Node.js workers don't work in serverless functions
2. **Browser-native**: Web Workers are fully supported in browsers
3. **Self-hosted worker**: No external CDN dependencies for security and reliability

```
User uploads PDF → Browser parses with PDF.js → Text sent to API → Analysis → Results
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Main analysis: accepts resume (file/text) + JD, returns full analysis |
| `/api/fetch-jd` | POST | Fetches job description from URL using Readability |
| `/api/export` | POST | Exports analysis to Markdown or PDF |

### Request Format

```bash
# With file upload
curl -X POST https://resumelytics.vercel.app/api/analyze \
  -F "resume=@resume.pdf" \
  -F "jd=Software Engineer at ACME"

# With pasted text
curl -X POST https://resumelytics.vercel.app/api/analyze \
  -F "resume_text=John Doe\nSoftware Engineer..." \
  -F "jd=Looking for a software engineer..."

# With custom weights
curl -X POST https://resumelytics.vercel.app/api/analyze \
  -F "resume_text=..." \
  -F "jd=..." \
  -F "weights={\"ats\":0.20,\"keywords\":0.50,\"impact\":0.20,\"clarity\":0.10}"
```

## 🖥️ Local Development

```bash
# Clone and install
git clone https://github.com/miguelaram2016/resume-ats-reviewer.git
cd resume-ats-reviewer
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## ☁️ Deploy to Vercel

1. Fork or push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the project
3. Ensure **Node.js Runtime** is selected (default)
4. Deploy — that's it!

The public folder (including `pdf.worker.min.js`) is automatically included in deployments.

## 🎨 Icons

This project uses [better-icons](https://github.com/better-auth/better-icons) for AI-powered icon search, integrated via MCP.

### Using with Codex

The project includes an MCP config at `mcp.json` — Codex can search and add icons using natural language:

- `"Search for UI icons"`
- `"Get lucide:file-text as SVG"`
- `"Add a download icon to my export button"`

## 📝 Notes

- Default weights: ATS 30%, Keywords 35%, Impact 20%, Clarity 15% — adjustable in the UI
- PII redaction is a first pass; extend `lib/pii.ts` for additional patterns
- PDF export uses a simple text render for maximum compatibility
- Prisma schema is included for future persistence (not currently used)

## 📄 License

MIT — use it however you'd like.
