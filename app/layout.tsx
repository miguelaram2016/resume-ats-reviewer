// app/layout.tsx
import type { Metadata } from "next";
// If your CSS is at app/globals.css use this path:
import "../globals.css";
// If your CSS is at project root (globals.css in repo root), use: import "../globals.css"

export const metadata: Metadata = {
  title: "Resume & ATS Reviewer",
  description: "Analyze resumes vs job descriptions with ATS checks & keyword scoring."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
