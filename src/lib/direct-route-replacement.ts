export async function replaceRouteAfterSuccessfulCalculation<T>(
  calculate: () => Promise<T>,
  replaceCurrentRoute: (route: T) => void
) {
  const route = await calculate();
  replaceCurrentRoute(route);
  return route;
}
