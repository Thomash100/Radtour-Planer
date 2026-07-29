import { redirect } from "next/navigation";

import { normalizePlannerStep } from "@/lib/planner-workflow";

export default function PlannerCompatibilityPage({
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
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const step = normalizePlannerStep(searchParams?.step);
  const target = step === "stage-create" || step === "stage-edit" ? "/planer/etappen" : "/planer/route";
  const query = params.toString();

  redirect(query ? `${target}?${query}` : target);
}
