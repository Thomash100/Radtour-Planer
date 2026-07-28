import { BookingLeadType, LeadStatus, PartnerCategory, SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

import { MAX_ROUTE_WAYPOINTS } from "@/lib/routing-limits";

export const routeCalculateSchema = z.object({
  start: z.string().min(2),
  end: z.string().min(2),
  waypoints: z
    .array(z.string().min(2))
    .max(MAX_ROUTE_WAYPOINTS, `Maximal ${MAX_ROUTE_WAYPOINTS} Zwischenziele sind möglich.`)
    .optional()
    .default([]),
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
  targetKm: z.coerce.number().min(15).max(180).default(55),
  travelDays: z.coerce.number().int().positive().max(60).optional(),
  targetDifficulty: z.enum(["easy", "moderate", "hard", "very_hard"]).optional(),
  elevationEstimated: z.boolean().optional().default(false),
  elevationProfile: z
    .array(
      z.object({
        distanceKm: z.coerce.number().nonnegative(),
        elevationM: z.coerce.number()
      })
    )
    .max(50000)
    .optional()
    .default([]),
  breakpoints: z
    .array(
      z.object({
        name: z.string().min(1),
        distanceKm: z.coerce.number().nonnegative()
      })
    )
    .optional()
    .default([])
});

export const stageUpdateSchema = z.object({
  startName: z.string().min(1).optional(),
  endName: z.string().min(1).optional(),
  distanceKm: z.coerce.number().nonnegative().optional(),
  elevationUp: z.coerce.number().int().nonnegative().optional(),
  elevationDown: z.coerce.number().int().nonnegative().optional(),
  geometryGeoJson: z
    .object({
      type: z.literal("LineString"),
      coordinates: z.array(z.tuple([z.number(), z.number()])).min(2)
    })
    .optional()
});

export const stageAccommodationSchema = z.object({
  poiId: z.string().min(1).optional().nullable(),
  name: z.string().min(1).max(240),
  type: z.enum(["hotel", "pension", "hostel", "camping", "apartment"]),
  place: z.string().min(1).max(240),
  coordinate: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  distanceToRouteKm: z.coerce.number().nonnegative().max(100),
  distanceToStageEndKm: z.coerce.number().nonnegative().max(100),
  source: z.string().min(1).max(160),
  link: z.string().url().optional().nullable(),
  phone: z.string().max(120).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  dataQuality: z.enum(["partner", "osm", "poi", "manual", "development"]),
  status: z.enum(["bookmarked", "overnight"]),
  features: z
    .object({
      bikeParking: z.literal(true).optional(),
      lockableBikeRoom: z.literal(true).optional(),
      ebikeCharging: z.literal(true).optional(),
      luggageStorage: z.literal(true).optional()
    })
    .strict(),
  routingStatus: z.enum(["not_required", "routed"]),
  routingMessage: z.string().max(500).optional().nullable(),
  detour: z
    .object({
      distanceKm: z.coerce.number().nonnegative().max(200),
      outboundDistanceKm: z.coerce.number().nonnegative().max(100),
      returnDistanceKm: z.coerce.number().nonnegative().max(100),
      geometryGeoJson: z.object({
        type: z.literal("LineString"),
        coordinates: z.array(z.tuple([z.number(), z.number()])).min(2)
      })
    })
    .optional()
    .nullable()
});

export const accommodationDetourSchema = z.object({
  stageEnd: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  accommodation: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  profile: z.enum(["balanced", "cycleways", "low_elevation", "touristic", "sportive"]).default("balanced")
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
