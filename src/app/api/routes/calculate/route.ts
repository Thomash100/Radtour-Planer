import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { normalizeRouteCalculationPayload } from "@/lib/direct-route-input";
import { calculateMockRoute } from "@/lib/mock-routing";
import { routeCalculateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = routeCalculateSchema.parse(normalizeRouteCalculationPayload(await readJson(request)));
    const route = calculateMockRoute(input);
    return NextResponse.json(route);
  } catch (error) {
    return apiError(error);
  }
}
