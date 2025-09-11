import '../globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Resume & ATS Reviewer',
  description: 'Analyze resumes against job descriptions and generate feedback',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
