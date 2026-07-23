import { calculateMockRoute, type RouteCalculationInput } from "@/lib/mock-routing";
import { calculateRoadRoute, RoutingProviderError } from "@/lib/road-routing";

export type RoutingProviderName = "brouter" | "mock";

export function configuredRoutingProvider(): RoutingProviderName {
  const configured = (process.env.ROUTING_PROVIDER ?? "brouter").trim().toLowerCase();
  if (configured === "brouter" || configured === "mock") {
    return configured;
  }

  throw new RoutingProviderError(`Unbekannter ROUTING_PROVIDER: "${configured}".`);
}

export async function calculateRoute(input: RouteCalculationInput) {
  const provider = configuredRoutingProvider();
  if (provider === "mock") {
    return calculateMockRoute(input);
  }

  return calculateRoadRoute(input);
}
