import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { bikeTripQueue } from "@/lib/queue";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const job = await bikeTripQueue.add("sync-osm-poi", {
      requestedAt: new Date().toISOString(),
      routeRegion: body.routeRegion ?? "demo",
      note: "MVP queues a placeholder job; production should sync cached OSM extracts or a paid provider."
    });

    return NextResponse.json({
      queued: true,
      jobId: job.id,
      message: "OSM-Sync wurde als Hintergrundjob vorgemerkt. Im MVP bleiben lokale Seed-Daten die Quelle."
    });
  } catch (error) {
    return apiError(error);
  }
}
