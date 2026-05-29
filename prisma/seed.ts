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

type Position = [number, number];

type RouteSeed = {
  id: string;
  name: string;
  description: string;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  geometryGeoJson: {
    type: "LineString";
    coordinates: Position[];
  };
  waypoints: Array<{
    order: number;
    name: string;
    lat: number;
    lon: number;
  }>;
  stages: Array<{
    dayNumber: number;
    startName: string;
    endName: string;
    distanceKm: number;
    elevationUp: number;
    elevationDown: number;
    coordinates: Position[];
  }>;
};

const munichSalzburgGeometry: RouteSeed["geometryGeoJson"] = {
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

const dresdenHamburgGeometry: RouteSeed["geometryGeoJson"] = {
  type: "LineString",
  coordinates: [
    [13.7373, 51.0504],
    [13.4775, 51.1616],
    [13.2877, 51.3077],
    [12.9961, 51.5602],
    [12.6499, 51.8661],
    [12.2421, 51.834],
    [11.6276, 52.1205],
    [11.9768, 52.5447],
    [12.0753, 52.8306],
    [11.7505, 53.0059],
    [11.0443, 53.1486],
    [10.5566, 53.3716],
    [9.9937, 53.5511]
  ]
};

const rosenheimTraunsteinGeometry: RouteSeed["geometryGeoJson"] = {
  type: "LineString",
  coordinates: [
    [12.1264, 47.8561],
    [12.1859, 47.9094],
    [12.3467, 47.8569],
    [12.3751, 47.8114],
    [12.6421, 47.8685]
  ]
};

function stageGeometry(geometry: RouteSeed["geometryGeoJson"], start: number, end: number) {
  return geometry.coordinates.slice(start, end);
}

const routeSeeds: RouteSeed[] = [
  {
    id: "route_demo_munich_salzburg",
    name: "Muenchen nach Salzburg",
    description: "Demo-Route fuer den MVP entlang Isar, Inn und Alpenvorland.",
    startName: "Muenchen",
    endName: "Salzburg",
    distanceKm: 152.4,
    elevationUp: 760,
    elevationDown: 610,
    geometryGeoJson: munichSalzburgGeometry,
    waypoints: [
      { order: 0, name: "Muenchen", lat: 48.1372, lon: 11.5761 },
      { order: 1, name: "Rosenheim", lat: 47.8561, lon: 12.1264 },
      { order: 2, name: "Traunstein", lat: 47.8685, lon: 12.6421 },
      { order: 3, name: "Salzburg", lat: 47.8095, lon: 13.0457 }
    ],
    stages: [
      {
        dayNumber: 1,
        startName: "Muenchen",
        endName: "Rosenheim",
        distanceKm: 63.5,
        elevationUp: 310,
        elevationDown: 220,
        coordinates: stageGeometry(munichSalzburgGeometry, 0, 4)
      },
      {
        dayNumber: 2,
        startName: "Rosenheim",
        endName: "Traunstein",
        distanceKm: 52.1,
        elevationUp: 270,
        elevationDown: 230,
        coordinates: stageGeometry(munichSalzburgGeometry, 3, 6)
      },
      {
        dayNumber: 3,
        startName: "Traunstein",
        endName: "Salzburg",
        distanceKm: 36.8,
        elevationUp: 180,
        elevationDown: 160,
        coordinates: stageGeometry(munichSalzburgGeometry, 5, 8)
      }
    ]
  },
  {
    id: "route_demo_dresden_hamburg",
    name: "Dresden nach Hamburg",
    description: "Laengere Demo-Route entlang des Elberadwegs mit vielen sichtbaren Zwischenstationen.",
    startName: "Dresden",
    endName: "Hamburg",
    distanceKm: 612.8,
    elevationUp: 1180,
    elevationDown: 1320,
    geometryGeoJson: dresdenHamburgGeometry,
    waypoints: [
      { order: 0, name: "Dresden", lat: 51.0504, lon: 13.7373 },
      { order: 1, name: "Meissen", lat: 51.1616, lon: 13.4775 },
      { order: 2, name: "Riesa", lat: 51.3077, lon: 13.2877 },
      { order: 3, name: "Torgau", lat: 51.5602, lon: 12.9961 },
      { order: 4, name: "Lutherstadt Wittenberg", lat: 51.8661, lon: 12.6499 },
      { order: 5, name: "Dessau-Rosslau", lat: 51.834, lon: 12.2421 },
      { order: 6, name: "Magdeburg", lat: 52.1205, lon: 11.6276 },
      { order: 7, name: "Tangermuende", lat: 52.5447, lon: 11.9768 },
      { order: 8, name: "Havelberg", lat: 52.8306, lon: 12.0753 },
      { order: 9, name: "Wittenberge", lat: 53.0059, lon: 11.7505 },
      { order: 10, name: "Hitzacker", lat: 53.1486, lon: 11.0443 },
      { order: 11, name: "Lauenburg/Elbe", lat: 53.3716, lon: 10.5566 },
      { order: 12, name: "Hamburg", lat: 53.5511, lon: 9.9937 }
    ],
    stages: [
      {
        dayNumber: 1,
        startName: "Dresden",
        endName: "Riesa",
        distanceKm: 58.2,
        elevationUp: 160,
        elevationDown: 140,
        coordinates: stageGeometry(dresdenHamburgGeometry, 0, 3)
      },
      {
        dayNumber: 2,
        startName: "Riesa",
        endName: "Lutherstadt Wittenberg",
        distanceKm: 118.4,
        elevationUp: 230,
        elevationDown: 250,
        coordinates: stageGeometry(dresdenHamburgGeometry, 2, 5)
      },
      {
        dayNumber: 3,
        startName: "Lutherstadt Wittenberg",
        endName: "Magdeburg",
        distanceKm: 91.6,
        elevationUp: 170,
        elevationDown: 190,
        coordinates: stageGeometry(dresdenHamburgGeometry, 4, 7)
      },
      {
        dayNumber: 4,
        startName: "Magdeburg",
        endName: "Havelberg",
        distanceKm: 106.1,
        elevationUp: 190,
        elevationDown: 220,
        coordinates: stageGeometry(dresdenHamburgGeometry, 6, 9)
      },
      {
        dayNumber: 5,
        startName: "Havelberg",
        endName: "Hitzacker",
        distanceKm: 102.8,
        elevationUp: 180,
        elevationDown: 205,
        coordinates: stageGeometry(dresdenHamburgGeometry, 8, 11)
      },
      {
        dayNumber: 6,
        startName: "Hitzacker",
        endName: "Hamburg",
        distanceKm: 135.7,
        elevationUp: 250,
        elevationDown: 315,
        coordinates: stageGeometry(dresdenHamburgGeometry, 10, 13)
      }
    ]
  },
  {
    id: "route_demo_rosenheim_traunstein",
    name: "Rosenheim nach Traunstein",
    description: "Kurze Demo-Route fuer schnelle Karten-, GPX- und POI-Tests im Alpenvorland.",
    startName: "Rosenheim",
    endName: "Traunstein",
    distanceKm: 58.6,
    elevationUp: 360,
    elevationDown: 280,
    geometryGeoJson: rosenheimTraunsteinGeometry,
    waypoints: [
      { order: 0, name: "Rosenheim", lat: 47.8561, lon: 12.1264 },
      { order: 1, name: "Bad Endorf", lat: 47.9094, lon: 12.1859 },
      { order: 2, name: "Prien am Chiemsee", lat: 47.8569, lon: 12.3467 },
      { order: 3, name: "Bernau am Chiemsee", lat: 47.8114, lon: 12.3751 },
      { order: 4, name: "Traunstein", lat: 47.8685, lon: 12.6421 }
    ],
    stages: [
      {
        dayNumber: 1,
        startName: "Rosenheim",
        endName: "Prien am Chiemsee",
        distanceKm: 31.4,
        elevationUp: 180,
        elevationDown: 120,
        coordinates: stageGeometry(rosenheimTraunsteinGeometry, 0, 3)
      },
      {
        dayNumber: 2,
        startName: "Prien am Chiemsee",
        endName: "Traunstein",
        distanceKm: 27.2,
        elevationUp: 180,
        elevationDown: 160,
        coordinates: stageGeometry(rosenheimTraunsteinGeometry, 2, 5)
      }
    ]
  }
];

async function seedPartnerUser(id: string, email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role: Role.PARTNER },
    create: {
      id,
      name,
      email,
      role: Role.PARTNER
    }
  });
}

async function seedRoute(userId: string, seed: RouteSeed) {
  const route = await prisma.route.upsert({
    where: { id: seed.id },
    update: {
      userId,
      name: seed.name,
      description: seed.description,
      startName: seed.startName,
      endName: seed.endName,
      distanceKm: seed.distanceKm,
      elevationUp: seed.elevationUp,
      elevationDown: seed.elevationDown,
      geometryGeoJson: seed.geometryGeoJson
    },
    create: {
      id: seed.id,
      userId,
      name: seed.name,
      description: seed.description,
      startName: seed.startName,
      endName: seed.endName,
      distanceKm: seed.distanceKm,
      elevationUp: seed.elevationUp,
      elevationDown: seed.elevationDown,
      geometryGeoJson: seed.geometryGeoJson
    }
  });

  await prisma.routeWaypoint.deleteMany({ where: { routeId: route.id } });
  await prisma.routeWaypoint.createMany({
    data: seed.waypoints.map((waypoint) => ({
      routeId: route.id,
      order: waypoint.order,
      name: waypoint.name,
      lat: waypoint.lat,
      lon: waypoint.lon
    }))
  });

  await prisma.routeStage.deleteMany({ where: { routeId: route.id } });
  await prisma.routeStage.createMany({
    data: seed.stages.map((stage) => ({
      routeId: route.id,
      dayNumber: stage.dayNumber,
      startName: stage.startName,
      endName: stage.endName,
      distanceKm: stage.distanceKm,
      elevationUp: stage.elevationUp,
      elevationDown: stage.elevationDown,
      geometryGeoJson: {
        type: "LineString",
        coordinates: stage.coordinates
      }
    }))
  });

  return route;
}

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

  const partnerUser = await seedPartnerUser("user_partner_alpenhof", "partner@biketriphub.local", "Partnerbetrieb");
  const luggageUser = await seedPartnerUser("user_partner_transfer", "transfer@biketriphub.local", "Gepaeck Shuttle");
  const elbeHotelUser = await seedPartnerUser("user_partner_elbequartier", "elbequartier@biketriphub.local", "Elbequartier Partner");
  const elbeRepairUser = await seedPartnerUser("user_partner_elbe_werkstatt", "werkstatt-elbe@biketriphub.local", "Elbe Werkstatt");
  const havelTransferUser = await seedPartnerUser("user_partner_havel_transfer", "havel-transfer@biketriphub.local", "Havel Transfer");
  const chiemseeCampUser = await seedPartnerUser("user_partner_chiemsee_camp", "camping@biketriphub.local", "Chiemsee Camping");

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

  const elbeHotel = await prisma.partner.upsert({
    where: { userId: elbeHotelUser.id },
    update: {
      companyName: "Elbequartier Dresden",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      isFeatured: true
    },
    create: {
      id: "partner_elbequartier",
      userId: elbeHotelUser.id,
      companyName: "Elbequartier Dresden",
      category: PartnerCategory.HOTEL,
      description: "Stadtnahes Rad-Hotel am Elberadweg mit Spaet-Check-in und gesicherter Radgarage.",
      address: "Terrassenufer 6, 01067 Dresden",
      lat: 51.0504,
      lon: 13.7373,
      phone: "+49 351 100200",
      email: "kontakt@elbequartier.local",
      website: "https://example.com/elbequartier",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      isFeatured: true
    }
  });

  const elbeRepair = await prisma.partner.upsert({
    where: { userId: elbeRepairUser.id },
    update: {
      companyName: "Elbe Radservice Torgau",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: false
    },
    create: {
      id: "partner_elbe_repair",
      userId: elbeRepairUser.id,
      companyName: "Elbe Radservice Torgau",
      category: PartnerCategory.BIKE_REPAIR,
      description: "Mobile Werkstatt und Ersatzteilservice fuer Elberadweg-Etappen.",
      address: "Elbstrasse 4, 04860 Torgau",
      lat: 51.5602,
      lon: 12.9961,
      phone: "+49 3421 445566",
      email: "hilfe@elbe-radservice.local",
      website: "https://example.com/elbe-radservice",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: false
    }
  });

  const havelTransfer = await prisma.partner.upsert({
    where: { userId: havelTransferUser.id },
    update: {
      companyName: "Havel-Elbe Gepaecklinie",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.SPONSORED,
      isFeatured: true
    },
    create: {
      id: "partner_havel_transfer",
      userId: havelTransferUser.id,
      companyName: "Havel-Elbe Gepaecklinie",
      category: PartnerCategory.LUGGAGE_TRANSFER,
      description: "Gepaecktransfer zwischen Magdeburg, Havelberg und Wittenberge.",
      address: "Am Hafen 2, 39539 Havelberg",
      lat: 52.8306,
      lon: 12.0753,
      phone: "+49 39387 1010",
      email: "transfer@havel-elbe.local",
      website: "https://example.com/havel-elbe-transfer",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.SPONSORED,
      isFeatured: true
    }
  });

  const chiemseeCamp = await prisma.partner.upsert({
    where: { userId: chiemseeCampUser.id },
    update: {
      companyName: "Chiemsee Bike Camp",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: true
    },
    create: {
      id: "partner_chiemsee_camp",
      userId: chiemseeCampUser.id,
      companyName: "Chiemsee Bike Camp",
      category: PartnerCategory.CAMPING,
      description: "Zeltplaetze, Ladepunkte und Radgarage fuer kurze Testtouren am Chiemsee.",
      address: "Uferweg 9, 83209 Prien am Chiemsee",
      lat: 47.8569,
      lon: 12.3467,
      phone: "+49 8051 778899",
      email: "servus@chiemsee-bike-camp.local",
      website: "https://example.com/chiemsee-bike-camp",
      status: PartnerStatus.APPROVED,
      subscriptionPlan: SubscriptionPlan.HIGHLIGHTED,
      isFeatured: true
    }
  });

  const seededRoutes = [];
  for (const seed of routeSeeds) {
    seededRoutes.push(await seedRoute(demoUser.id, seed));
  }
  const munichRoute = seededRoutes.find((route) => route.id === "route_demo_munich_salzburg") ?? seededRoutes[0];
  const elbeRoute = seededRoutes.find((route) => route.id === "route_demo_dresden_hamburg") ?? seededRoutes[0];

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
    },
    {
      id: "poi_chiemsee_camp",
      name: "Chiemsee Bike Camp",
      category: PoiCategory.ACCOMMODATION,
      lat: 47.8569,
      lon: 12.3467,
      address: "Uferweg 9, 83209 Prien am Chiemsee",
      phone: "+49 8051 778899",
      website: "https://example.com/chiemsee-bike-camp",
      source: "seed",
      osmId: "seed-chiemsee-camp",
      partnerId: chiemseeCamp.id,
      tagsJson: {
        ebikeFriendly: true,
        bikeGarage: true,
        luggageAccepted: true,
        camping: true
      }
    },
    {
      id: "poi_salzburg_bike_shop",
      name: "Salzach Radladen",
      category: PoiCategory.BIKE_SHOP,
      lat: 47.8095,
      lon: 13.0457,
      address: "Rudolfskai 10, 5020 Salzburg",
      phone: "+43 662 101010",
      website: "https://example.com/salzach-radladen",
      source: "seed",
      osmId: "seed-salzburg-bike-shop",
      partnerId: null,
      tagsJson: {
        spareParts: true,
        ebikeService: true
      }
    },
    {
      id: "poi_dresden_elbehotel",
      name: "Elbequartier Dresden",
      category: PoiCategory.ACCOMMODATION,
      lat: 51.0504,
      lon: 13.7373,
      address: "Terrassenufer 6, 01067 Dresden",
      phone: "+49 351 100200",
      website: "https://example.com/elbequartier",
      source: "seed",
      osmId: "seed-dresden-elbehotel",
      partnerId: elbeHotel.id,
      tagsJson: {
        ebikeFriendly: true,
        bikeGarage: true,
        luggageAccepted: true,
        cityStop: true
      }
    },
    {
      id: "poi_meissen_sight",
      name: "Albrechtsburg Blick",
      category: PoiCategory.SIGHT,
      lat: 51.1616,
      lon: 13.4775,
      address: "Domplatz, 01662 Meissen",
      phone: null,
      website: "https://example.com/albrechtsburg",
      source: "seed",
      osmId: "seed-meissen-sight",
      partnerId: null,
      tagsJson: {
        scenic: true,
        cultural: true
      }
    },
    {
      id: "poi_riesa_supermarket",
      name: "Riesa Etappenmarkt",
      category: PoiCategory.SUPERMARKET,
      lat: 51.3077,
      lon: 13.2877,
      address: "Hauptstrasse 22, 01589 Riesa",
      phone: null,
      website: null,
      source: "seed",
      osmId: "seed-riesa-supermarket",
      partnerId: null,
      tagsJson: {
        supplies: true,
        lateOpening: true
      }
    },
    {
      id: "poi_torgau_repair",
      name: "Elbe Radservice Torgau",
      category: PoiCategory.BIKE_REPAIR,
      lat: 51.5602,
      lon: 12.9961,
      address: "Elbstrasse 4, 04860 Torgau",
      phone: "+49 3421 445566",
      website: "https://example.com/elbe-radservice",
      source: "seed",
      osmId: "seed-torgau-repair",
      partnerId: elbeRepair.id,
      tagsJson: {
        repair: true,
        spareParts: true,
        ebikeService: true,
        emergencyContact: true
      }
    },
    {
      id: "poi_wittenberg_cafe",
      name: "Cafe Lutherpause",
      category: PoiCategory.CAFE,
      lat: 51.8661,
      lon: 12.6499,
      address: "Markt 1, 06886 Lutherstadt Wittenberg",
      phone: null,
      website: "https://example.com/lutherpause",
      source: "seed",
      osmId: "seed-wittenberg-cafe",
      partnerId: null,
      tagsJson: {
        breakfast: true,
        bikeParking: true
      }
    },
    {
      id: "poi_dessau_bauhaus",
      name: "Bauhaus Dessau",
      category: PoiCategory.SIGHT,
      lat: 51.834,
      lon: 12.2421,
      address: "Gropiusallee 38, 06846 Dessau-Rosslau",
      phone: null,
      website: "https://example.com/bauhaus-dessau",
      source: "seed",
      osmId: "seed-dessau-bauhaus",
      partnerId: null,
      tagsJson: {
        cultural: true,
        architecture: true
      }
    },
    {
      id: "poi_magdeburg_restaurant",
      name: "Elbblick Magdeburg",
      category: PoiCategory.RESTAURANT,
      lat: 52.1205,
      lon: 11.6276,
      address: "Schleinufer 12, 39104 Magdeburg",
      phone: "+49 391 303030",
      website: "https://example.com/elbblick",
      source: "seed",
      osmId: "seed-magdeburg-restaurant",
      partnerId: null,
      tagsJson: {
        vegetarian: true,
        bikeParking: true
      }
    },
    {
      id: "poi_havel_transfer",
      name: "Havel-Elbe Gepaecklinie",
      category: PoiCategory.LUGGAGE_TRANSFER,
      lat: 52.8306,
      lon: 12.0753,
      address: "Am Hafen 2, 39539 Havelberg",
      phone: "+49 39387 1010",
      website: "https://example.com/havel-elbe-transfer",
      source: "seed",
      osmId: "seed-havel-transfer",
      partnerId: havelTransfer.id,
      tagsJson: {
        luggageTransfer: true,
        bikeTransport: true,
        ebikeTransport: true
      }
    },
    {
      id: "poi_tangermuende_pension",
      name: "Pension Backsteinblick",
      category: PoiCategory.ACCOMMODATION,
      lat: 52.5447,
      lon: 11.9768,
      address: "Kirchstrasse 7, 39590 Tangermuende",
      phone: "+49 39322 7788",
      website: "https://example.com/backsteinblick",
      source: "seed",
      osmId: "seed-tangermuende-pension",
      partnerId: null,
      tagsJson: {
        bikeGarage: true,
        luggageAccepted: true
      }
    },
    {
      id: "poi_havelberg_water",
      name: "Trinkwasser Havelberg Dom",
      category: PoiCategory.DRINKING_WATER,
      lat: 52.8306,
      lon: 12.0753,
      address: "Dombezirk, 39539 Havelberg",
      phone: null,
      website: null,
      source: "seed",
      osmId: "seed-havelberg-water",
      partnerId: null,
      tagsJson: {
        free: true,
        seasonal: false
      }
    },
    {
      id: "poi_wittenberge_bike_shop",
      name: "Radladen Elbtor",
      category: PoiCategory.BIKE_SHOP,
      lat: 53.0059,
      lon: 11.7505,
      address: "Bahnstrasse 18, 19322 Wittenberge",
      phone: "+49 3877 112233",
      website: "https://example.com/radladen-elbtor",
      source: "seed",
      osmId: "seed-wittenberge-bike-shop",
      partnerId: null,
      tagsJson: {
        spareParts: true,
        ebikeService: true
      }
    },
    {
      id: "poi_hitzacker_restaurant",
      name: "Faehrhaus Hitzacker",
      category: PoiCategory.RESTAURANT,
      lat: 53.1486,
      lon: 11.0443,
      address: "Elbstrasse 1, 29456 Hitzacker",
      phone: "+49 5862 9090",
      website: "https://example.com/faehrhaus-hitzacker",
      source: "seed",
      osmId: "seed-hitzacker-restaurant",
      partnerId: null,
      tagsJson: {
        vegetarian: true,
        scenic: true
      }
    },
    {
      id: "poi_lauenburg_market",
      name: "Lauenburg Proviantmarkt",
      category: PoiCategory.SUPERMARKET,
      lat: 53.3716,
      lon: 10.5566,
      address: "Elbstrasse 20, 21481 Lauenburg/Elbe",
      phone: null,
      website: null,
      source: "seed",
      osmId: "seed-lauenburg-market",
      partnerId: null,
      tagsJson: {
        supplies: true,
        lateOpening: true
      }
    },
    {
      id: "poi_hamburg_hostel",
      name: "Bike Hostel Hamburg Hafen",
      category: PoiCategory.ACCOMMODATION,
      lat: 53.5511,
      lon: 9.9937,
      address: "Deichstrasse 12, 20459 Hamburg",
      phone: "+49 40 112244",
      website: "https://example.com/bike-hostel-hamburg",
      source: "seed",
      osmId: "seed-hamburg-hostel",
      partnerId: null,
      tagsJson: {
        ebikeFriendly: true,
        bikeGarage: true
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
      message: "Demo-Anfrage fuer Gepaecktransfer zwischen Etappen.",
      routeId: munichRoute.id
    },
    create: {
      id: "lead_demo_transfer",
      userId: demoUser.id,
      partnerId: bagPartner.id,
      routeId: munichRoute.id,
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

  await prisma.bookingLead.upsert({
    where: { id: "lead_demo_havel_transfer" },
    update: {
      status: LeadStatus.NEW,
      message: "Demo-Anfrage fuer Gepaecktransfer auf der Elberadweg-Route.",
      routeId: elbeRoute.id
    },
    create: {
      id: "lead_demo_havel_transfer",
      userId: demoUser.id,
      partnerId: havelTransfer.id,
      routeId: elbeRoute.id,
      type: BookingLeadType.LUGGAGE_TRANSFER,
      startDate: new Date("2026-07-10T09:00:00.000Z"),
      endDate: new Date("2026-07-15T18:00:00.000Z"),
      persons: 2,
      bikes: 2,
      luggageItems: 4,
      message: "Demo-Anfrage fuer Gepaecktransfer auf der Elberadweg-Route.",
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

  await prisma.adPlacement.upsert({
    where: { id: "ad_demo_elbequartier" },
    update: {
      title: "Elberadweg Startkomfort",
      status: AdStatus.ACTIVE
    },
    create: {
      id: "ad_demo_elbequartier",
      partnerId: elbeHotel.id,
      title: "Elberadweg Startkomfort",
      description: "Gesponserte Unterkunft am Start der langen Dresden-Hamburg-Demo.",
      category: "ACCOMMODATION",
      routeRegion: "Dresden-Hamburg",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-10-15T23:59:59.000Z"),
      budget: 650,
      status: AdStatus.ACTIVE
    }
  });

  console.log("Seed data ready: demo routes, POI, partners, leads and ad placements.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
