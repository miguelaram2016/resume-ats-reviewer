'use client';
import React from 'react';
export function FindingsList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="rounded-2xl border p-4 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <ul className="list-disc pl-6 space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  );
}