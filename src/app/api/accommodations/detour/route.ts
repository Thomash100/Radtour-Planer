import { NextResponse } from "next/server";

import { calculateAccommodationDetour } from "@/lib/accommodation-routing";
import { apiError, readJson } from "@/lib/api";
import { RoutingProviderError } from "@/lib/road-routing";
import { accommodationDetourSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = accommodationDetourSchema.parse(await readJson(request));
    const detour = await calculateAccommodationDetour(input.stageEnd, input.accommodation, input.profile);
    return NextResponse.json({ detour, routingStatus: "routed" });
  } catch (error) {
    if (error instanceof RoutingProviderError) {
      return NextResponse.json(
        {
          error: `Der Unterkunftsabstecher konnte nicht über BRouter berechnet werden. Die Auswahl wurde nicht geändert. ${error.message}`
        },
        { status: 502 }
      );
    }
    return apiError(error);
  }
}
