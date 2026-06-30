import { NextResponse } from "next/server";

import { APP_BUILD_DATE, APP_MVP_STATUS, APP_VERSION } from "@/lib/version";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "radtour-planer",
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    mvpStatus: APP_MVP_STATUS,
    timestamp: new Date().toISOString()
  });
}
