import type { Metadata } from "next";

import { TravelOrderClient } from "@/components/TravelOrderClient";

export const metadata: Metadata = {
  title: "Reiseauftrag",
  description: "Reisedaten, Etappen, Unterkünfte und Gepäcktransport als lokalen MVP-Planungsauftrag dokumentieren."
};

type TravelOrderPageProps = {
  searchParams?: {
    tour?: string;
    order?: string;
  };
};

export default function TravelOrderPage({ searchParams }: TravelOrderPageProps) {
  return <TravelOrderClient initialOrderId={searchParams?.order} initialTourId={searchParams?.tour} />;
}
