interface NavigationStateLike {
  index?: number;
  routes?: {name?: string; state?: NavigationStateLike}[];
}

/**
 * Walks a navigation state down to the focused leaf route. The TV rail uses it
 * to keep its selected destination in sync with navigation that happens outside
 * the rail itself.
 */
export function findActiveRouteName(
  state: NavigationStateLike | undefined,
): string | undefined {
  if (!state?.routes?.length) {
    return undefined;
  }

  const route = state.routes[state.index ?? 0];

  if (!route) {
    return undefined;
  }

  return findActiveRouteName(route.state) ?? route.name;
}
