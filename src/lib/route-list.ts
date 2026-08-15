import type { Prisma } from "@prisma/client";

export const DEFAULT_ROUTE_LIST_LIMIT = 25;
export const MAX_ROUTE_LIST_LIMIT = 100;

/**
 * List views must never load route or stage geometries. A complete route is
 * available through /api/routes/[id] after the user selects one entry.
 */
export const routeListSelect = {
  id: true,
  name: true,
  startName: true,
  endName: true,
  distanceKm: true,
  elevationUp: true,
  elevationDown: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      stages: true
    }
  }
} satisfies Prisma.RouteSelect;

export type RouteListDatabaseRow = Prisma.RouteGetPayload<{
  select: typeof routeListSelect;
}>;

export type RouteListSummary = {
  id: string;
  name: string;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  createdAt: Date;
  updatedAt: Date;
  stageCount: number;
};

export type RouteListQuery = {
  cursor: string | null;
  limit: number;
};

export type RouteListPage = {
  routes: RouteListSummary[];
  pagination: {
    limit: number;
    nextCursor: string | null;
  };
};

export function parseRouteListQuery(url: string): RouteListQuery {
  const searchParams = new URL(url).searchParams;
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_ROUTE_LIST_LIMIT)
    : DEFAULT_ROUTE_LIST_LIMIT;
  const rawCursor = searchParams.get("cursor")?.trim() ?? "";

  return {
    cursor: rawCursor.length > 0 && rawCursor.length <= 128 ? rawCursor : null,
    limit
  };
}

export function createRouteListPage(rows: readonly RouteListDatabaseRow[], limit: number): RouteListPage {
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const routes = pageRows.map(toRouteListSummary);

  return {
    routes,
    pagination: {
      limit,
      nextCursor: hasMore ? routes.at(-1)?.id ?? null : null
    }
  };
}

function toRouteListSummary(row: RouteListDatabaseRow): RouteListSummary {
  return {
    id: row.id,
    name: row.name,
    startName: row.startName,
    endName: row.endName,
    distanceKm: row.distanceKm,
    elevationUp: row.elevationUp,
    elevationDown: row.elevationDown,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stageCount: row._count.stages
  };
}
