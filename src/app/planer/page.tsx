import type { Metadata } from "next";

import { PlannerClient } from "@/components/PlannerClient";

export const metadata: Metadata = {
  title: "Planer",
  description:
    "GPX-Route laden, kürzen, Etappen erzeugen, Orte projizieren, Unterkünfte vormerken und die gesamte Tour speichern."
};

export default function PlannerPage({
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
    />
  );
}
