import { PartnerStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoPartnerUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { partnerRegisterSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = partnerRegisterSchema.parse(await readJson(request));
    const user = await getDemoPartnerUser();
    const partner = await prisma.partner.upsert({
      where: { userId: user.id },
      update: {
        ...input,
        status: PartnerStatus.PENDING_REVIEW
      },
      create: {
        ...input,
        userId: user.id,
        status: PartnerStatus.PENDING_REVIEW
      }
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
