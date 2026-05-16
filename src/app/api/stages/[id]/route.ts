import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const body = await readJson(request);
    const stage = await prisma.routeStage.update({
      where: { id: params.id },
      data: {
        startName: typeof body.startName === "string" ? body.startName : undefined,
        endName: typeof body.endName === "string" ? body.endName : undefined,
        distanceKm: Number.isFinite(Number(body.distanceKm)) ? Number(body.distanceKm) : undefined,
        elevationUp: Number.isFinite(Number(body.elevationUp)) ? Number(body.elevationUp) : undefined,
        elevationDown: Number.isFinite(Number(body.elevationDown)) ? Number(body.elevationDown) : undefined,
        geometryGeoJson: body.geometryGeoJson
      }
    });

    return NextResponse.json({ stage });
  } catch (error) {
    return apiError(error);
  }
}
