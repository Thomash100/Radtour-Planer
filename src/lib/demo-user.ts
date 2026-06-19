import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@biketriphub.local" },
    update: { name: "Demo Nutzer", role: Role.USER },
    create: {
      name: "Demo Nutzer",
      email: "demo@biketriphub.local",
      role: Role.USER
    }
  });
}

export async function getDemoPartnerUser() {
  return prisma.user.upsert({
    where: { email: "partner-selfservice@biketriphub.local" },
    update: { name: "Selfservice Partner", role: Role.PARTNER },
    create: {
      name: "Selfservice Partner",
      email: "partner-selfservice@biketriphub.local",
      role: Role.PARTNER
    }
  });
}
