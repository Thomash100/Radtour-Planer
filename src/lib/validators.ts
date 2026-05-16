import { BookingLeadType, LeadStatus, PartnerCategory, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

export const routeCalculateSchema = z.object({
  start: z.string().min(2),
  end: z.string().min(2),
  waypoints: z.array(z.string().min(2)).optional().default([]),
  profile: z
    .enum(["balanced", "cycleways", "low_elevation", "touristic", "sportive"])
    .optional()
    .default("balanced")
});

export const saveRouteSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  startName: z.string().min(2),
  endName: z.string().min(2),
  distanceKm: z.coerce.number().nonnegative(),
  elevationUp: z.coerce.number().int().nonnegative(),
  elevationDown: z.coerce.number().int().nonnegative(),
  geometryGeoJson: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2)
  }),
  waypoints: z
    .array(
      z.object({
        order: z.number().int().nonnegative(),
        name: z.string(),
        lat: z.number(),
        lon: z.number()
      })
    )
    .optional()
    .default([])
});

export const autoStageSchema = z.object({
  targetKm: z.coerce.number().min(15).max(180).default(55)
});

export const partnerRegisterSchema = z.object({
  companyName: z.string().min(2),
  category: z.nativeEnum(PartnerCategory),
  description: z.string().optional().nullable(),
  address: z.string().min(3),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  phone: z.string().optional().nullable(),
  email: z.string().email(),
  website: z.string().url().optional().nullable()
});

export const partnerUpdateSchema = partnerRegisterSchema.partial().extend({
  subscriptionPlan: z.nativeEnum(SubscriptionPlan).optional(),
  isFeatured: z.boolean().optional()
});

export const leadCreateSchema = z.object({
  partnerId: z.string().min(1),
  routeId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  type: z.nativeEnum(BookingLeadType).default(BookingLeadType.PARTNER_CONTACT),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  persons: z.coerce.number().int().min(1).default(1),
  bikes: z.coerce.number().int().min(0).default(0),
  luggageItems: z.coerce.number().int().min(0).default(0),
  message: z.string().max(1500).optional().nullable()
});

export const leadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus)
});

export const upgradeSchema = z.object({
  subscriptionPlan: z.nativeEnum(SubscriptionPlan)
});
