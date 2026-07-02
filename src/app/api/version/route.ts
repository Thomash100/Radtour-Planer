import { NextResponse } from "next/server";

import { APP_BUILD_DATE, APP_DEPLOYMENT_CHANNEL, APP_INDEXING_ALLOWED, APP_MVP_STATUS, APP_VERSION } from "@/lib/version";

export async function GET() {
  return NextResponse.json({
    service: "radtour-planer",
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    mvpStatus: APP_MVP_STATUS,
    deploymentChannel: APP_DEPLOYMENT_CHANNEL,
    indexingAllowed: APP_INDEXING_ALLOWED
  });
}
