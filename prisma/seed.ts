import {
  AdStatus,
  BookingLeadType,
  LeadStatus,
  PartnerCategory,
  PartnerStatus,
  PoiCategory,
  PrismaClient,
  Role,
  SubscriptionPlan
} from "@prisma/client";

const prisma = new PrismaClient();

const demoRouteGeometry = {
  type: "LineString",
  coordinates: [
    [11.5761, 48.1372],
    [11.7009, 48.0134],
    [11.8611, 47.8924],
    [12.1264, 47.8561],
    [12.3582, 47.8589],
    [12.6448, 47.8873],
    [12.8316, 47.8129],
    [13.0457, 47.8095]
  ]
};

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@biketriphub.local" },
    update: { name: "Demo Nutzer", role: Role.USER },
    create: {
      id: "user_demo",
      name: "Demo Nutzer",
      email: "demo@biketriphub.local",
      role: Role.USER
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@biketriphub.local" },
    update: { name: "Admin", role: Role.ADMIN },
    create: {
      id: "user_admin",
      name: "Admin",
      email: "admin@biketriphub.local",
      role: Role.ADMIN
    }
  });

  const partnerUser = await prisma.user.upsert({
    where: { email: "partner@biketriphub.local" },
    update: { name: "Partnerbetrieb", role: Role.PARTNER },
    create: {
      id: "user_partner_alpenhof",
      name: "Partnerbetrieb",
      email: "partner@biketriphub.local",
      role: Role.PARTNER
    }
  });

  const luggageUser = await prisma.user.upsert({
    where: { email: "transfer@biketriphub.local" },
    update: { name: "Gepaeck Shuttle", role: Role.PARTNER },
    create: {
      id: "user_partner_transfer",
      name: "Gepaeck Shuttle",
      email: "transfer@biketriphub.local",
      role: Role.PARTNER
    }
  });

  const alpenhof = await prisma.partner.upsert({
    where: { userId: partnerUser.id },
    update: {
      companyName: "Radpension Alpenhof",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      isFeatured: true
    },
    create: {
      id: "partner_alpenhof",
      userId: partnerUser.id,
      companyName: "Radpension Alpenhof",
      category: PartnerCategory.PENSION,
      description: "Fahrradfreundliche Pension mit sicherer Garage, Werkzeugstation und fruehem Fruehstueck.",
      address: "Marktplatz 8, 83022 Rosenheim",
      lat: 47.8561,
      lon: 12.1264,
      phone: "+49 8031 123456",
      email: "servus@radpension-alpenhof.local",
      website: "https://example.com/radpension-alpenhof",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      isFeatured: true
    }
  });

  const bagPartner = await prisma.partner.upsert({
    where: { userId: luggageUser.id },
    update: {
      companyName: "Inn-Salzach Gepaecktransfer",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: true
    },
    create: {
      id: "partner_bag_transfer",
      userId: luggageUser.id,
      companyName: "Inn-Salzach Gepaecktransfer",
      category: PartnerCategory.LUGGAGE_TRANSFER,
      description: "Gepaeck- und Fahrradtransfer zwischen Etappenorten im Alpenvorland.",
      address: "Bahnhofstrasse 2, 83278 Traunstein",
      lat: 47.8685,
      lon: 12.6421,
      phone: "+49 861 987654",
      email: "anfrage@inn-salzach-transfer.local",
      website: "https://example.com/gepaecktransfer",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: true
    }
  });

  const route = await prisma.route.upsert({
    where: { id: "route_demo_munich_salzburg" },
    update: {
      userId: demoUser.id,
      name: "Muenchen nach Salzburg",
      description: "Demo-Route fuer den MVP entlang Isar, Inn und Alpenvorland.",
      startName: "Muenchen",
      endName: "Salzburg",
      distanceKm: 152.4,
      elevationUp: 760,
      elevationDown: 610,
      geometryGeoJson: demoRouteGeometry
    },
    create: {
      id: "route_demo_munich_salzburg",
      userId: demoUser.id,
      name: "Muenchen nach Salzburg",
      description: "Demo-Route fuer den MVP entlang Isar, Inn und Alpenvorland.",
      startName: "Muenchen",
      endName: "Salzburg",
      distanceKm: 152.4,
      elevationUp: 760,
      elevationDown: 610,
      geometryGeoJson: demoRouteGeometry
    }
  });

  await prisma.routeWaypoint.deleteMany({ where: { routeId: route.id } });
  await prisma.routeWaypoint.createMany({
    data: [
      { routeId: route.id, order: 0, name: "Muenchen", lat: 48.1372, lon: 11.5761 },
      { routeId: route.id, order: 1, name: "Rosenheim", lat: 47.8561, lon: 12.1264 },
      { routeId: route.id, order: 2, name: "Traunstein", lat: 47.8685, lon: 12.6421 },
      { routeId: route.id, order: 3, name: "Salzburg", lat: 47.8095, lon: 13.0457 }
    ]
  });

  await prisma.routeStage.deleteMany({ where: { routeId: route.id } });
  await prisma.routeStage.createMany({
    data: [
      {
        routeId: route.id,
        dayNumber: 1,
        startName: "Muenchen",
        endName: "Rosenheim",
        distanceKm: 63.5,
        elevationUp: 310,
        elevationDown: 220,
        geometryGeoJson: {
          type: "LineString",
          coordinates: demoRouteGeometry.coordinates.slice(0, 4)
        }
      },
      {
        routeId: route.id,
        dayNumber: 2,
        startName: "Rosenheim",
        endName: "Traunstein",
        distanceKm: 52.1,
        elevationUp: 270,
        elevationDown: 230,
        geometryGeoJson: {
          type: "LineString",
          coordinates: demoRouteGeometry.coordinates.slice(3, 6)
        }
      },
      {
        routeId: route.id,
        dayNumber: 3,
        startName: "Traunstein",
        endName: "Salzburg",
        distanceKm: 36.8,
        elevationUp: 180,
        elevationDown: 160,
        geometryGeoJson: {
          type: "LineString",
          coordinates: demoRouteGeometry.coordinates.slice(5)
        }
      }
    ]
  });

  const pois = [
    {
      id: "poi_alpenhof",
      name: "Radpension Alpenhof",
      category: PoiCategory.ACCOMMODATION,
      lat: 47.8561,
      lon: 12.1264,
      address: "Marktplatz 8, 83022 Rosenheim",
      phone: "+49 8031 123456",
      website: "https://example.com/radpension-alpenhof",
      source: "seed",
      osmId: "seed-alpenhof",
      partnerId: alpenhof.id,
      tagsJson: {
        ebikeFriendly: true,
        bikeGarage: true,
        luggageAccepted: true,
        restaurantInHouse: true,
        bookingProvider: "partner"
      }
    },
    {
      id: "poi_transfer",
      name: "Inn-Salzach Gepaecktransfer",
      category: PoiCategory.LUGGAGE_TRANSFER,
      lat: 47.8685,
      lon: 12.6421,
      address: "Bahnhofstrasse 2, 83278 Traunstein",
      phone: "+49 861 987654",
      website: "https://example.com/gepaecktransfer",
      source: "seed",
      osmId: "seed-transfer",
      partnerId: bagPartner.id,
      tagsJson: {
        luggageTransfer: true,
        bikeTransport: true,
        ebikeTransport: true
      }
    },
    {
      id: "poi_bike_repair",
      name: "Werkstatt am Innradweg",
      category: PoiCategory.BIKE_REPAIR,
      lat: 47.8924,
      lon: 11.8611,
      address: "Innufer 14, 83043 Bad Aibling",
      phone: "+49 8061 5555",
      website: "https://example.com/werkstatt",
      source: "seed",
      osmId: "seed-repair",
      partnerId: null,
      tagsJson: {
        repair: true,
        spareParts: true,
        ebikeService: true,
        emergencyContact: true
      }
    },
    {
      id: "poi_cafe",
      name: "Cafe Radpause",
      category: PoiCategory.CAFE,
      lat: 48.0134,
      lon: 11.7009,
      address: "Dorfplatz 3, 85649 Brunnthal",
      phone: null,
      website: "https://example.com/cafe-radpause",
      source: "seed",
      osmId: "seed-cafe",
      partnerId: null,
      tagsJson: {
        breakfast: true,
        vegetarian: true,
        bikeParking: true
      }
    },
    {
      id: "poi_supermarket",
      name: "Nahkauf Etappenproviant",
      category: PoiCategory.SUPERMARKET,
      lat: 47.8873,
      lon: 12.6448,
      address: "Wasserburger Strasse 21, 83278 Traunstein",
      phone: null,
      website: null,
      source: "seed",
      osmId: "seed-supermarket",
      partnerId: null,
      tagsJson: {
        supplies: true
      }
    },
    {
      id: "poi_water",
      name: "Trinkwasserstelle Salzachufer",
      category: PoiCategory.DRINKING_WATER,
      lat: 47.8129,
      lon: 12.8316,
      address: "Salzachuferweg, 83435 Bad Reichenhall",
      phone: null,
      website: null,
      source: "seed",
      osmId: "seed-water",
      partnerId: null,
      tagsJson: {
        free: true,
        seasonal: false
      }
    },
    {
      id: "poi_sight",
      name: "Aussichtspunkt Alpenblick",
      category: PoiCategory.SIGHT,
      lat: 47.8589,
      lon: 12.3582,
      address: "Panoramaweg, 83209 Prien",
      phone: null,
      website: "https://example.com/alpenblick",
      source: "seed",
      osmId: "seed-sight",
      partnerId: null,
      tagsJson: {
        scenic: true
      }
    }
  ];

  for (const poi of pois) {
    await prisma.poi.upsert({
      where: { id: poi.id },
      update: poi,
      create: poi
    });
  }

  await prisma.bookingLead.upsert({
    where: { id: "lead_demo_transfer" },
    update: {
      status: LeadStatus.NEW,
      message: "Demo-Anfrage fuer Gepaecktransfer zwischen Etappen."
    },
    create: {
      id: "lead_demo_transfer",
      userId: demoUser.id,
      partnerId: bagPartner.id,
      routeId: route.id,
      type: BookingLeadType.LUGGAGE_TRANSFER,
      startDate: new Date("2026-06-20T09:00:00.000Z"),
      endDate: new Date("2026-06-22T18:00:00.000Z"),
      persons: 2,
      bikes: 2,
      luggageItems: 3,
      message: "Demo-Anfrage fuer Gepaecktransfer zwischen Etappen.",
      status: LeadStatus.NEW
    }
  });

  await prisma.adPlacement.upsert({
    where: { id: "ad_demo_alpenhof" },
    update: {
      title: "Premium-Stopp in Rosenheim",
      status: AdStatus.ACTIVE
    },
    create: {
      id: "ad_demo_alpenhof",
      partnerId: alpenhof.id,
      title: "Premium-Stopp in Rosenheim",
      description: "Gesponserte Unterkunft fuer Radtouren durch das Alpenvorland.",
      category: "ACCOMMODATION",
      routeRegion: "Muenchen-Salzburg",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-09-30T23:59:59.000Z"),
      budget: 450,
      status: AdStatus.ACTIVE
    }
  });

  console.log("Seed data ready: demo route, POI, partners, lead and ad placement.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
