"use client";

import { Check, ListTree, PanelTopOpen } from "lucide-react";

import type { RoutePlanningInteractionMode } from "@/lib/planner-workflow";
import { cn } from "@/lib/utils";

const choices = [
  {
    mode: "inline" as const,
    title: "Eingabe auf derselben Seite",
    variant: "Variante A",
    description: "Die gewählte Planungsfunktion wird direkt unter der Auswahl geöffnet.",
    icon: PanelTopOpen
  },
  {
    mode: "wizard" as const,
    title: "Geführter Assistent",
    variant: "Variante B",
    description: "Die gewählte Planungsfunktion wird als eigener Planungsschritt geöffnet.",
    icon: ListTree
  }
];

export function RoutePlanningModeSelector({
  mode,
  onChange,
  compact = false
}: {
  mode: RoutePlanningInteractionMode;
  onChange: (mode: RoutePlanningInteractionMode) => void;
  compact?: boolean;
}) {
  return (
    <fieldset
      className={cn(
        "rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]",
        compact ? "p-4" : "p-5 sm:p-6"
      )}
      data-route-planning-mode-selector="true"
    >
      <legend className="sr-only">Bedienmodus Routenplanung</legend>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Routenplanung – Bedienung</p>
        <h2 className={cn("mt-1 font-bold text-slate-950", compact ? "text-lg" : "text-xl")}>Bedienmodus Routenplanung</h2>
        <p className="mt-1 text-sm text-slate-500">Die Auswahl ist eine App-Einstellung und verändert keine Tourdaten.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const active = choice.mode === mode;
          return (
            <label
              key={choice.mode}
              className={cn(
                "relative cursor-pointer rounded-[20px] border p-4 transition",
                active
                  ? "border-primary bg-emerald-50 ring-2 ring-primary/15"
                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
              )}
              data-route-planning-mode={choice.mode}
            >
              <input
                className="sr-only"
                type="radio"
                name="route-planning-interaction-mode"
                value={choice.mode}
                checked={active}
                onChange={() => onChange(choice.mode)}
              />
              <span className="flex items-start gap-3">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", active ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-slate-950">{choice.title}</strong>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{choice.variant}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{choice.description}</span>
                </span>
                {active && <Check className="ml-auto h-5 w-5 shrink-0 text-primary" aria-label="Aktiv" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
