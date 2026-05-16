import { PartnerStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getDemoPartnerUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getDemoPartnerUser();
    const partner = await prisma.partner.update({
      where: { userId: user.id },
      data: { status: PartnerStatus.PENDING_REVIEW }
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return apiError(error);
  }
}
