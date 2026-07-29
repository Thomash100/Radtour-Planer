import type { Metadata } from "next";

import { PlannerClient } from "@/components/PlannerClient";

export const metadata: Metadata = {
  title: "Routenplanung",
  description: "Eine Fahrradroute direkt planen oder als GPX importieren, prüfen und als gemeinsame Grundlage speichern."
};

export default function RoutePlannerPage({
  searchParams
}: {
  searchParams?: {
    start?: string;
    end?: string;
    mode?: string;
    open?: string;
    step?: string;
    tour?: string;
  };
}) {
  return (
    <PlannerClient
      initialEnd={searchParams?.end ?? ""}
      initialMode={searchParams?.mode}
      initialStart={searchParams?.start ?? ""}
      initialStep={searchParams?.step}
      initialTourId={searchParams?.tour}
      openLast={searchParams?.open === "last"}
      workflowView="route"
    />
  );
}
