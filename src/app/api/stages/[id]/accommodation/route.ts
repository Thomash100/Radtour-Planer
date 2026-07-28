import {
  AccommodationDataQuality,
  AccommodationRoutingStatus,
  AccommodationStatus,
  AccommodationType,
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { stageAccommodationSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

const typeMap = {
  hotel: AccommodationType.HOTEL,
  pension: AccommodationType.PENSION,
  hostel: AccommodationType.HOSTEL,
  camping: AccommodationType.CAMPING,
  apartment: AccommodationType.APARTMENT
} as const;

const dataQualityMap = {
  partner: AccommodationDataQuality.PARTNER,
  osm: AccommodationDataQuality.OSM,
  poi: AccommodationDataQuality.POI,
  manual: AccommodationDataQuality.MANUAL,
  development: AccommodationDataQuality.DEVELOPMENT
} as const;

const statusMap = {
  bookmarked: AccommodationStatus.BOOKMARKED,
  overnight: AccommodationStatus.OVERNIGHT
} as const;

export async function PUT(request: Request, { params }: Context) {
  try {
    const input = stageAccommodationSchema.parse(await readJson(request));
    const stage = await prisma.routeStage.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!stage) {
      return NextResponse.json({ error: "Etappe nicht gefunden." }, { status: 404 });
    }
    const persistedPoi = input.poiId
      ? await prisma.poi.findUnique({ where: { id: input.poiId }, select: { id: true } })
      : null;

    const values = {
      poiId: persistedPoi?.id ?? null,
      name: input.name,
      type: typeMap[input.type],
      place: input.place,
      lat: input.coordinate[1],
      lon: input.coordinate[0],
      distanceToRouteKm: input.distanceToRouteKm,
      distanceToStageEndKm: input.distanceToStageEndKm,
      source: input.source,
      sourceLink: input.link,
      phone: input.phone,
      email: input.email,
      dataQuality: dataQualityMap[input.dataQuality],
      status: statusMap[input.status],
      featuresJson: input.features,
      routingStatus:
        input.routingStatus === "routed" ? AccommodationRoutingStatus.ROUTED : AccommodationRoutingStatus.NOT_REQUIRED,
      routingMessage: input.routingMessage,
      detourDistanceKm: input.detour?.distanceKm ?? null,
      detourOutboundKm: input.detour?.outboundDistanceKm ?? null,
      detourReturnKm: input.detour?.returnDistanceKm ?? null,
      detourGeometryGeoJson: input.detour?.geometryGeoJson ?? Prisma.DbNull
    };
    const accommodation = await prisma.stageAccommodation.upsert({
      where: { stageId: params.id },
      create: { stageId: params.id, ...values },
      update: values
    });

    return NextResponse.json({ accommodation });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await prisma.stageAccommodation.deleteMany({ where: { stageId: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
