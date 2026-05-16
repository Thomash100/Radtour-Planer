import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { splitRouteIntoStages, type LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { autoStageSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Context) {
  try {
    const { targetKm } = autoStageSchema.parse(await readJson(request));
    const route = await prisma.route.findUnique({ where: { id: params.id } });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const geometry = route.geometryGeoJson as LineStringGeoJson;
    const splitStages = splitRouteIntoStages(geometry, targetKm);
    const generatedStages = splitStages.map((stage, index) => ({
      ...stage,
      startName: index === 0 ? route.startName : stage.startName,
      endName: index === splitStages.length - 1 ? route.endName : stage.endName
    }));

    await prisma.routeStage.deleteMany({ where: { routeId: params.id } });
    await prisma.routeStage.createMany({
      data: generatedStages.map((stage) => ({
        routeId: params.id,
        dayNumber: stage.dayNumber,
        startName: stage.startName,
        endName: stage.endName,
        distanceKm: stage.distanceKm,
        elevationUp: stage.elevationUp,
        elevationDown: stage.elevationDown,
        geometryGeoJson: stage.geometryGeoJson
      }))
    });

    const stages = await prisma.routeStage.findMany({
      where: { routeId: params.id },
      orderBy: { dayNumber: "asc" }
    });

    return NextResponse.json({ stages });
  } catch (error) {
    return apiError(error);
  }
}
