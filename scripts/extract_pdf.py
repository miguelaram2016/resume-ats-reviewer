#!/usr/bin/env python3
"""PDF text extraction for ATS resume reviewer."""
import sys
import json
import base64

# Try pypdf first, fall back to pdfplumber
try:
    from pypdf import PdfReader
    def extract_text(path):
        reader = PdfReader(path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
except:
    try:
        import pdfplumber
        def extract_text(path):
            with pdfplumber.open(path) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception as e:
        def extract_text(path):
            return f"ERROR: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: extract_pdf.py <pdf_path>"}))
        sys.exit(1)
    
    text = extract_text(sys.argv[1])
    # Return as base64 to avoid encoding issues
    result = {"text": base64.b64encode(text.encode('utf-8')).decode('ascii')}
    print(json.dumps(result))
