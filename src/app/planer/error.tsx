"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PlannerError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Planer konnte nicht gerendert werden.", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Routenplanung</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Die Route konnte nicht geladen oder weiterverarbeitet werden.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Versuche den letzten Schritt erneut oder kehre zur Routenplanung zurück.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
          <Link
            href="/planer/route"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
          >
            Zur Routenplanung
          </Link>
        </div>
      </section>
    </main>
  );
}
