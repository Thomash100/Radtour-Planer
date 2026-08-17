"use client";

import { MapPinned, Route, Scale } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { PlannerWorkflowView } from "@/lib/planner-workflow";

const items = [
  { id: "route" as const, href: "/planer/route?open=last", label: "Routenplanung", icon: Route },
  { id: "stages" as const, href: "/planer/etappen?open=last", label: "Etappenplanung", icon: MapPinned },
  { id: "optimization" as const, href: "/planer/optimierung", label: "Routenvergleich", icon: Scale }
];

export function PlannerWorkflowNavigation({
  activeView,
  hasRoute
}: {
  activeView: PlannerWorkflowView | "optimization";
  hasRoute: boolean;
}) {
  return (
    <nav aria-label="Planungsbereiche" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeView;
        const isDisabled = item.id === "stages" && !hasRoute && !isActive;
        const className = cn(
          "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
          isActive ? "border-primary bg-primary text-primary-foreground" : "bg-white text-slate-800 hover:bg-muted",
          isDisabled && "cursor-not-allowed opacity-50 hover:bg-white"
        );

        if (isDisabled) {
          return (
            <span key={item.id} aria-disabled="true" className={className} title="Zuerst eine Route planen oder laden.">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
          );
        }

        return (
          <Link key={item.id} aria-current={isActive ? "page" : undefined} className={className} href={item.href}>
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
