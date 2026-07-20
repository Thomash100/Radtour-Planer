import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { normalizeRouteCalculationPayload } from "@/lib/direct-route-input";
import { RoutingProviderError } from "@/lib/road-routing";
import { calculateRoute } from "@/lib/routing-provider";
import { routeCalculateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = routeCalculateSchema.parse(normalizeRouteCalculationPayload(await readJson(request)));
    const route = await calculateRoute(input);
    return NextResponse.json(route);
  } catch (error) {
    if (error instanceof RoutingProviderError) {
      return apiError(error, 502);
    }
    return apiError(error);
  }
}
