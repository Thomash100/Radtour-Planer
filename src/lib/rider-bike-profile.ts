import { z } from "zod";

export const RIDER_BIKE_PROFILE_STORAGE_KEY = "biketriphub.riderBikeProfile.v1";
export const RIDER_BIKE_PROFILE_EXPORT_SCHEMA = "biketriphub.rider-bike-profile.v1";

export const fitnessLevels = ["low", "moderate", "high", "very_high"] as const;
export const experienceLevels = ["beginner", "experienced", "expert"] as const;
export const bikeTypes = ["trekking", "touring", "gravel", "road", "mountain", "cargo", "ebike"] as const;
export const assistanceProfiles = ["eco", "tour", "sport", "auto"] as const;
export const personalRidingStyles = ["economical", "balanced", "sportive"] as const;

export const fitnessLevelLabels: Record<(typeof fitnessLevels)[number], string> = {
  low: "Gelegentlich aktiv",
  moderate: "Regelmäßig aktiv",
  high: "Trainiert",
  very_high: "Sehr trainiert"
};

export const experienceLevelLabels: Record<(typeof experienceLevels)[number], string> = {
  beginner: "Einsteiger",
  experienced: "Erfahren",
  expert: "Sehr erfahren"
};

export const bikeTypeLabels: Record<(typeof bikeTypes)[number], string> = {
  trekking: "Trekkingrad",
  touring: "Tourenrad",
  gravel: "Gravelbike",
  road: "Rennrad",
  mountain: "Mountainbike",
  cargo: "Lastenrad",
  ebike: "E-Bike"
};

export const assistanceProfileLabels: Record<(typeof assistanceProfiles)[number], string> = {
  eco: "Eco",
  tour: "Tour",
  sport: "Sport",
  auto: "Automatisch"
};

export const personalRidingStyleLabels: Record<(typeof personalRidingStyles)[number], string> = {
  economical: "Reichweitenorientiert",
  balanced: "Ausgewogen",
  sportive: "Sportlich"
};

const riderBikeProfileObjectSchema = z.object({
  schemaVersion: z.literal(1),
  rider: z.object({
    name: z.string().trim().max(80).optional(),
    bodyWeightKg: z.number().finite().min(30).max(250),
    fitnessLevel: z.enum(fitnessLevels),
    experienceLevel: z.enum(experienceLevels),
    desiredDailyLoad: z.number().finite().min(0).max(100),
    preferredDailyRideHours: z.number().finite().min(0.5).max(16),
    maximumDailyRideHours: z.number().finite().min(0.5).max(20)
  }),
  bike: z.object({
    type: z.enum(bikeTypes),
    bikeWeightKg: z.number().finite().min(5).max(100),
    luggageWeightKg: z.number().finite().min(0).max(100),
    ebike: z.object({
      batteryCapacityWh: z.number().finite().min(100).max(2500),
      batteryCount: z.number().int().min(1).max(6),
      usableBatteryCapacityPercent: z.number().finite().min(10).max(100).default(90),
      motorPowerW: z.number().finite().min(100).max(1500),
      motorAssistancePercent: z.number().finite().min(0).max(400).default(100),
      referenceRangeKm: z.number().finite().min(10).max(500),
      assistanceProfile: z.enum(assistanceProfiles),
      desiredReservePercent: z.number().finite().min(0).max(60),
      chargerPowerW: z.number().finite().min(20).max(1000).default(100),
      chargingLossPercent: z.number().finite().min(0).max(40).default(10),
      personalRidingStyle: z.enum(personalRidingStyles).default("balanced")
    })
  })
});

export const riderBikeProfileSchema = riderBikeProfileObjectSchema.superRefine((profile, context) => {
  if (profile.rider.maximumDailyRideHours < profile.rider.preferredDailyRideHours) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rider", "maximumDailyRideHours"],
      message: "Die maximale Fahrzeit muss mindestens der bevorzugten Fahrzeit entsprechen."
    });
  }
});

export type RiderBikeProfile = z.infer<typeof riderBikeProfileObjectSchema>;
export type RiderBikeProfileExport = {
  schema: typeof RIDER_BIKE_PROFILE_EXPORT_SCHEMA;
  exportedAt: string;
  app: "BikeTripHub";
  profile: RiderBikeProfile;
};

export const DEFAULT_RIDER_BIKE_PROFILE: RiderBikeProfile = {
  schemaVersion: 1,
  rider: {
    bodyWeightKg: 75,
    fitnessLevel: "moderate",
    experienceLevel: "experienced",
    desiredDailyLoad: 50,
    preferredDailyRideHours: 5,
    maximumDailyRideHours: 8
  },
  bike: {
    type: "trekking",
    bikeWeightKg: 15,
    luggageWeightKg: 12,
    ebike: {
      batteryCapacityWh: 500,
      batteryCount: 1,
      usableBatteryCapacityPercent: 90,
      motorPowerW: 250,
      motorAssistancePercent: 100,
      referenceRangeKm: 80,
      assistanceProfile: "tour",
      desiredReservePercent: 20,
      chargerPowerW: 100,
      chargingLossPercent: 10,
      personalRidingStyle: "balanced"
    }
  }
};

export function parseRiderBikeProfileValue(value: unknown): RiderBikeProfile | null {
  const parsed = riderBikeProfileSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  const name = parsed.data.rider.name?.trim();
  return {
    ...parsed.data,
    rider: {
      ...parsed.data.rider,
      ...(name ? { name } : { name: undefined })
    }
  };
}

export function parseStoredRiderBikeProfile(raw: string | null): RiderBikeProfile | null {
  if (!raw) {
    return null;
  }

  try {
    return parseRiderBikeProfileValue(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createRiderBikeProfileExport(
  profile: RiderBikeProfile,
  exportedAt = new Date().toISOString()
): RiderBikeProfileExport {
  return {
    schema: RIDER_BIKE_PROFILE_EXPORT_SCHEMA,
    exportedAt,
    app: "BikeTripHub",
    profile
  };
}

export function parseRiderBikeProfileExport(raw: string): RiderBikeProfile | null {
  try {
    const parsed = JSON.parse(raw) as Partial<RiderBikeProfileExport> | RiderBikeProfile;
    if ("profile" in parsed) {
      if (parsed.schema !== RIDER_BIKE_PROFILE_EXPORT_SCHEMA || parsed.app !== "BikeTripHub") {
        return null;
      }
      return parseRiderBikeProfileValue(parsed.profile);
    }
    return parseRiderBikeProfileValue(parsed);
  } catch {
    return null;
  }
}
