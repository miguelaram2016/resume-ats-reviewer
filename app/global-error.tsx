"use client";
import React from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // eslint-disable-next-line no-console
  console.error("app/global-error.tsx boundary", { message: error?.message, stack: error?.stack, digest: error?.digest });
  return (
    <html>
      <body>
        <div className="p-6 space-y-3">
          <h2 className="text-xl font-semibold">A fatal error occurred.</h2>
          <pre className="text-sm whitespace-pre-wrap opacity-80">{error?.message}</pre>
          <button className="rounded-md border px-3 py-1" onClick={() => reset()}>Reload</button>
        </div>
      </body>
    </html>
  );
}
