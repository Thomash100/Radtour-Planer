import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoPartnerUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { partnerUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await getDemoPartnerUser();
    const partner = await prisma.partner.findUnique({
      where: { userId: user.id },
      include: {
        pois: true,
        bookingLeads: {
          orderBy: { createdAt: "desc" }
        },
        adPlacements: true
      }
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = partnerUpdateSchema.parse(await readJson(request));
    const user = await getDemoPartnerUser();
    const partner = await prisma.partner.update({
      where: { userId: user.id },
      data: input
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return apiError(error);
  }
}
