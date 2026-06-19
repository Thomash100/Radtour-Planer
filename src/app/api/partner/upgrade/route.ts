import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoPartnerUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { upgradeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const { subscriptionPlan } = upgradeSchema.parse(await readJson(request));
    const user = await getDemoPartnerUser();
    const partner = await prisma.partner.update({
      where: { userId: user.id },
      data: {
        subscriptionPlan,
        isFeatured: subscriptionPlan !== "FREE"
      }
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return apiError(error);
  }
}
